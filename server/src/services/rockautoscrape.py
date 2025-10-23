from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import sys
import json
import time
import re
from collections import defaultdict


def scrape_rockauto(
    make="CHEVROLET",
    year="2020",
    model="CORVETTE",
    engine="6.2L V8",
    category="ELECTRICAL",
    subcategory="BATTERY",
):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            make_url = make.replace(" ", "+").upper()
            model_url = model.replace(" ", "+").upper()

            print("Opening RockAuto Catalog...", file=sys.stderr)
            page.goto(f"https://www.rockauto.com/en/catalog/{make_url},{year},{model_url}", wait_until="networkidle")
            time.sleep(2)

            def click_label(text, partial_ok=False):
                """Click a label by exact or partial match"""
                try:
                    link = page.locator(f"text={text}")
                    if link.count() > 0:
                        link.first.click()
                        print(f"Clicked {text}", file=sys.stderr)
                        page.wait_for_timeout(1200)
                        return True

                    if partial_ok:
                        all_links = page.locator("a")
                        for i in range(all_links.count()):
                            link_text = all_links.nth(i).inner_text().strip().upper()
                            if text.upper() in link_text:
                                all_links.nth(i).click()
                                print(f"Clicked partial match {link_text}", file=sys.stderr)
                                page.wait_for_timeout(1200)
                                return True
                except Exception as e:
                    print(f"Click failed for {text}: {e}", file=sys.stderr)
                return False

            # STEP 1
            all_links = page.locator("a")
            found_models = []
            for i in range(all_links.count()):
                link_text = all_links.nth(i).inner_text().strip().upper()
                if model.upper() in link_text:
                    found_models.append(link_text)

            if found_models and len(found_models) > 1:
                print(f"Found multiple models for {model}: {found_models}", file=sys.stderr)
                for m in found_models:
                    try:
                        all_links.filter(has_text=m).first.click()
                        print(f"Clicked variant: {m}", file=sys.stderr)
                        page.wait_for_timeout(1500)
                    except Exception as e:
                        print(f"Could not click variant {m}: {e}", file=sys.stderr)
            else:
                click_label(model, partial_ok=True)

            # STEP 2
            displacement_match = re.search(r"(\d\.\d)", engine)
            displacement = displacement_match.group(1) if displacement_match else None

            if not click_label(engine):
                if displacement:
                    print(f"Trying partial engine match for {displacement}L", file=sys.stderr)
                    click_label(displacement, partial_ok=True)

            # STEP 3
            for label in [category, subcategory]:
                success = click_label(label, partial_ok=True)
                if not success:
                    print(f"Could not click {label}, stopping early.", file=sys.stderr)
                    break

            # STEP 4
            try:
                page.wait_for_selector('[id^="listingtd"][id*="[price]"] span', timeout=20000)
                print("Parts table loaded", file=sys.stderr)
            except Exception:
                print("Timed out waiting for parts table.", file=sys.stderr)
                browser.close()
                return {}

            # STEP 5
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            grouped_parts = defaultdict(list)
            listings = soup.select("tbody[id^='listingcontainer']")

            for listing in listings:
                sort_group = "Unspecified"
                supplemental = listing.select_one("input[id^='listing_data_supplemental']")
                if supplemental and supplemental.has_attr("value"):
                    try:
                        data = json.loads(supplemental["value"])
                        sort_group = data.get("sortgrouptext", "Unspecified").strip()
                    except json.JSONDecodeError:
                        pass

                brand = listing.select_one(".listing-final-manufacturer")
                partnum = listing.select_one(".listing-final-partnumber")
                desc = listing.select_one(".span-link-underline-remover")
                price = listing.select_one("span[id^='dprice'][id$='[v]']")
                core = listing.select_one("span[id^='dcore'][id$='[v]']")
                total = listing.select_one("span[id^='dtotal'][id$='[v]']")
                img = listing.select_one("img.listing-inline-image-thumb")

                # Handle hidden prices
                if (not price or not price.get_text(strip=True)) and listing.select_one("input[id^='pricebreakdown']"):
                    hidden_prices = listing.select("input[id^='pricebreakdown']")
                    for hp in hidden_prices:
                        try:
                            val = json.loads(hp.get("value", "{}"))
                            if "v" in val and "$" in val["v"]:
                                price = val["v"]
                                break
                        except json.JSONDecodeError:
                            continue

                brand = brand.get_text(strip=True) if brand else ""
                partnum = partnum.get_text(strip=True) if partnum else ""
                desc = desc.get_text(strip=True) if desc else ""
                price = price.get_text(strip=True) if hasattr(price, "get_text") else str(price or "")
                core = core.get_text(strip=True) if core else ""
                total = total.get_text(strip=True) if total else ""
                img = f"https://www.rockauto.com{img['src']}" if img and img.has_attr("src") else ""

                if brand and (price or total):
                    grouped_parts[sort_group].append({
                        "brand": brand,
                        "part_num": partnum,
                        "desc": desc,
                        "price": price,
                        "core": core,
                        "total": total,
                        "image": img
                    })

            total_parts = sum(len(v) for v in grouped_parts.values())
            print(f"Scraped {total_parts} parts across {len(grouped_parts)} groups.", file=sys.stderr)

            return grouped_parts

        finally:
            browser.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 6:
        make, year, model, engine, category, subcategory = args
    else:
        make, year, model, engine, category, subcategory = (
            "FORD",
            "2019",
            "TRANSIT CONNECT",
            "2.5L 4-Cyl",
            "ELECTRICAL",
            "BATTERY",
        )

    try:
        results = scrape_rockauto(make, year, model, engine, category, subcategory)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
