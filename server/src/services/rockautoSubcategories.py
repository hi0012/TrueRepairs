from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import sys, json, time, re

def get_subcategories(make, year, model, engine, category):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        make_url = make.replace(" ", "+").upper()
        model_url = model.replace(" ", "+").upper()

        try:
            print(f"Opening RockAuto catalog for {year} {make} {model}...", file=sys.stderr)
            page.goto(f"https://www.rockauto.com/en/catalog/{make_url},{year},{model_url}", wait_until="networkidle")
            time.sleep(2)

            def click_label(text, partial_ok=False):
                try:
                    link = page.locator(f"text={text}")
                    if link.count() > 0:
                        link.first.click()
                        print(f"Clicked {text}", file=sys.stderr)
                        page.wait_for_timeout(1000)
                        return True
                    if partial_ok:
                        for i in range(page.locator("a.navlabellink").count()):
                            t = page.locator("a.navlabellink").nth(i).inner_text().strip().upper()
                            if text.upper() in t:
                                page.locator("a.navlabellink").nth(i).click()
                                print(f"Clicked partial match {t}", file=sys.stderr)
                                page.wait_for_timeout(1000)
                                return True
                except Exception as e:
                    print(f"Click failed for {text}: {e}", file=sys.stderr)
                return False

            # Step 1
            displacement_match = re.search(r"(\d\.\d)", engine)
            displacement = displacement_match.group(1) if displacement_match else None
            if not click_label(engine) and displacement:
                click_label(displacement, partial_ok=True)

            page.wait_for_timeout(1500)

            # Step 2
            print(f"Expanding category {category}...", file=sys.stderr)
            if not click_label(category):
                click_label(category.split()[0], partial_ok=True)

            page.wait_for_timeout(2500)
            html = page.content()
            soup = BeautifulSoup(html, "html.parser")

            # Step 3
            parent_node = None
            for node in soup.select("input[id^='jsn']"):
                try:
                    data = json.loads(node["value"])
                    if data.get("groupname", "").strip().lower() == category.lower():
                        parent_node = node
                        parent_index = data.get("groupindex")
                        break
                except Exception:
                    continue

            if not parent_node:
                print(f"No parent node found for {category}", file=sys.stderr)
                return {"category": category, "subcategories": []}

            # Step 4
            parent_id = parent_node["id"].replace("jsn", "navchildren")
            children_div = soup.find("div", {"id": parent_id})
            if not children_div:
                print(f"No subcategory container for {category}", file=sys.stderr)
                return {"category": category, "subcategories": []}

            # Step 5
            subcategories = []
            for child in children_div.select("a.navlabellink"):
                name = child.get_text(strip=True)
                href = child.get("href")
                if name and href:
                    subcategories.append({
                        "name": name,
                        "url": "https://www.rockauto.com" + href
                    })

            print(f"Found {len(subcategories)} subcategories under {category}", file=sys.stderr)
            return {"category": category, "subcategories": subcategories}

        except Exception as e:
            print(f"Scrape error: {e}", file=sys.stderr)
            return {"error": str(e)}

        finally:
            browser.close()


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 5:
        print(json.dumps({"error": "Missing args"}))
        sys.exit(1)
    make, year, model, engine, category = args
    try:
        results = get_subcategories(make, year, model, engine, category)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
