import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DATA_FILE = "data.json"
def load_data():
    if not os.path.exists(DATA_FILE):
        return {"boxes": []}
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        print(f"  → {args[0]} {args[1]}")

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path):
        ext = path.split(".")[-1]
        types = {"html": "text/html", "css": "text/css", "js": "application/javascript"}
        ctype = types.get(ext, "text/plain")
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            self.send_file("index.html")
        elif path == "/style.css":
            self.send_file("style.css")
        elif path == "/app.js":
            self.send_file("app.js")
        elif path == "/api/data":
            self.send_json(200, load_data())
        elif path == "/api/search":
            query = parse_qs(parsed.query).get("q", [""])[0].strip().lower()
            data = load_data()
            results = []
            for i, box in enumerate(data["boxes"]):
                for item in box["items"]:
                    if query and query in item:
                        results.append({"boxIndex": i, "boxName": box["name"], "item": item})
            self.send_json(200, {"results": results})
        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        parsed = urlparse(self.path)
        path = parsed.path
        data = load_data()

        # Add a new box
        if path == "/api/boxes":
            name = body.get("name", "").strip()
            color = body.get("color", "#c05c2e")
            if not name:
                return self.send_json(400, {"error": "Box name required"})
            data["boxes"].append({"name": name, "color": color, "items": []})
            save_data(data)
            self.send_json(200, {"ok": True, "boxes": data["boxes"]})

        # Add item to a box
        elif path == "/api/items":
            bi = body.get("boxIndex")
            item = body.get("item", "").strip().lower()
            if bi is None or not item:
                return self.send_json(400, {"error": "boxIndex and item required"})
            bi = int(bi)
            if bi >= len(data["boxes"]):
                return self.send_json(404, {"error": "Box not found"})
            if item in data["boxes"][bi]["items"]:
                return self.send_json(409, {"error": "Item already in box"})
            data["boxes"][bi]["items"].append(item)
            save_data(data)
            self.send_json(200, {"ok": True, "boxes": data["boxes"]})
        else:
            self.send_json(404, {"error": "Not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        data = load_data()

        if len(parts) == 3 and parts[0] == "api" and parts[1] == "boxes":
            try:
                bi = int(parts[2])
                data["boxes"].pop(bi)
                save_data(data)
                self.send_json(200, {"ok": True, "boxes": data["boxes"]})
            except (IndexError, ValueError):
                self.send_json(404, {"error": "Box not found"})

        elif len(parts) == 5 and parts[0] == "api" and parts[1] == "boxes" and parts[3] == "items":
            try:
                bi = int(parts[2])
                ii = int(parts[4])
                data["boxes"][bi]["items"].pop(ii)
                save_data(data)
                self.send_json(200, {"ok": True, "boxes": data["boxes"]})
            except (IndexError, ValueError):
                self.send_json(404, {"error": "Not found"})

        else:
            self.send_json(404, {"error": "Not found"})


if __name__ == "__main__":
    import threading, time, webbrowser
    port = 8080
    url = f"http://localhost:{port}"
    print(f"\n📦 BoxTracker server starting...")
    print(f"   Open in Chrome: {url}")
    print(f"   Data saved to:  {os.path.abspath(DATA_FILE)}")
    print(f"   Press Ctrl+C to stop\n")

    def open_browser():
        time.sleep(1)
        try:
            webbrowser.get("chrome").open(url)
        except:
            webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()
    HTTPServer(("", port), Handler).serve_forever()