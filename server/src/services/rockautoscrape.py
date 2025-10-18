from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import sys
import json
import time


def scrape_rockauto(
    make="CHEVROLET",
    year="2020",
    model="CORVETTE",
    engine="4.3L V6",
    category="ELECTRICAL",
    subcategory="BATTERY",):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)  # set False for debugging
        page = browser.new_page()

        try:
            print("Opening RockAuto Catalog...", file=sys.stderr)
            page.goto("https://www.rockauto.com/en/catalog", wait_until="networkidle")
            time.sleep(2)

            def click_label(text):
                try:
                    link = page.locator(f"text={text}")
                    if link.count() > 0:
                        link.first.click()
                        print(f"Clicked {text}", file=sys.stderr)
                        page.wait_for_timeout(1200)
                        return True
                except Exception as e:
                    print(f"Click failed for {text}: {e}", file=sys.stderr)
                return False

            # Step through
            for label in [make, year, model, engine, category, subcategory]:
                success = click_label(label)
                if not success:
                    print(f"Could not click {label}, stopping early.", file=sys.stderr)
                    break

            # Wait for price elements to load
            try:
                page.wait_for_selector('[id^="listingtd"][id*="[price]"] span', timeout=20000)
                print("Parts table loaded", file=sys.stderr)
            except Exception:
                print("Timed out waiting for parts table.", file=sys.stderr)
                browser.close()
                return []

            # Parse HTML content
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            parts = []
            listings = soup.select("tbody[id^='listingcontainer']")

            for listing in listings:
                brand = listing.select_one(".listing-final-manufacturer")
                partnum = listing.select_one(".listing-final-partnumber")
                desc = listing.select_one(".span-link-underline-remover")
                price = listing.select_one("span[id^='dprice'][id$='[v]']")
                core = listing.select_one("span[id^='dcore'][id$='[v]']")
                total = listing.select_one("span[id^='dtotal'][id$='[v]']")
                img = listing.select_one("img.listing-inline-image-thumb")

                # text values
                brand = brand.get_text(strip=True) if brand else ""
                partnum = partnum.get_text(strip=True) if partnum else ""
                desc = desc.get_text(strip=True) if desc else ""
                price = price.get_text(strip=True) if price else ""
                core = core.get_text(strip=True) if core else ""
                total = total.get_text(strip=True) if total else ""
                img = (
                    "https://www.rockauto.com" + img["src"]
                    if img and img.has_attr("src")
                    else ""
                )

                if brand and price:
                    parts.append(
                        {
                            "brand": brand,
                            "part_num": partnum,
                            "desc": desc,
                            "price": price,
                            "core": core,
                            "total": total,
                            "image": img,
                        }
                    )

            print(f"Scraped {len(parts)} parts successfully.", file=sys.stderr)
            return parts

        finally:
            browser.close()


if __name__ == "__main__":
    # Allow running as standalone
    args = sys.argv[1:]
    if len(args) == 6:
        make, year, model, engine, category, subcategory = args
    else:
        # quick test
        make, year, model, engine, category, subcategory = (
            "CHEVROLET",
            "2020",
            "CORVETTE",
            "6.2L V8",
            "ELECTRICAL",
            "BATTERY",
        )

    try:
        results = scrape_rockauto(make, year, model, engine, category, subcategory)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
