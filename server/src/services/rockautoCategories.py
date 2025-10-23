from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import sys
import json
import time
import re

def scrape_rockauto_categories(make, year, model, engine):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            make_url = make.replace(" ", "+").upper()
            model_url = model.replace(" ", "+").upper()

            print(f"Opening RockAuto catalog for {year} {make} {model}...", file=sys.stderr)
            page.goto(f"https://www.rockauto.com/en/catalog/{make_url},{year},{model_url}", wait_until="networkidle")
            time.sleep(2)

            # Try to click engine
            def click_label(text, partial_ok=False):
                """Click a link by exact or partial text match."""
                try:
                    link = page.locator(f"text={text}")
                    if link.count() > 0:
                        link.first.click()
                        print(f"Clicked {text}", file=sys.stderr)
                        page.wait_for_timeout(1200)
                        return True

                    if partial_ok:
                        all_links = page.locator("a")
                        count = all_links.count()
                        for i in range(count):
                            link_text = all_links.nth(i).inner_text().strip().upper()
                            if text.upper() in link_text:
                                all_links.nth(i).click()
                                print(f"Clicked partial match {link_text}", file=sys.stderr)
                                page.wait_for_timeout(1200)
                                return True
                except Exception as e:
                    print(f"Click failed for {text}: {e}", file=sys.stderr)
                return False

            # Step 1
            displacement_match = re.search(r"(\d\.\d)", engine)
            displacement = displacement_match.group(1) if displacement_match else None

            if not click_label(engine):
                if displacement:
                    print(f"Trying partial engine match for {displacement}L", file=sys.stderr)
                    click_label(displacement, partial_ok=True)

            # Wait for the vehicle-specific page to load
            page.wait_for_timeout(1500)

            # Step 2
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            nodes = soup.select("input[id^='jsn']")
            carcode = None
            for node in nodes:
                try:
                    data = json.loads(node["value"])
                    if (
                        data.get("make") == make.upper()
                        and data.get("year") == year
                        and data.get("model") == model.upper()
                        and displacement
                        and displacement in data.get("engine", "")
                    ):
                        carcode = data.get("carcode")
                        break
                except Exception:
                    continue

            if not carcode:
                print("Could not find carcode for engine", file=sys.stderr)
                return {"error": "carcode not found", "categories": []}

            print(f"Found carcode={carcode}", file=sys.stderr)

            # Step 3
            categories = []
            for node in nodes:
                try:
                    data = json.loads(node["value"])
                    if (
                        data.get("carcode") == carcode
                        and data.get("nodetype") == "groupname"
                        and data.get("groupname")
                    ):
                        group = data["groupname"].strip()
                        if group and group not in categories:
                            categories.append(group)
                except Exception:
                    continue

            print(f"Found {len(categories)} categories for carcode={carcode}", file=sys.stderr)
            return {"carcode": carcode, "categories": sorted(categories)}

        except Exception as e:
            print(f"Scrape error: {e}", file=sys.stderr)
            return {"error": str(e)}

        finally:
            browser.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 4:
        make, year, model, engine = args
    else:
        make, year, model, engine = "FORD", "2019", "TRANSIT CONNECT", "2.5L 4-Cyl"

    try:
        results = scrape_rockauto_categories(make, year, model, engine)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
