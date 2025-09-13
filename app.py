import flask as f

app = f.Flask(__name__)


@app.route("/<path:path>")
def catch_all(path):
    return f.send_from_directory(".", path)


@app.route("/")
def home():
    return catch_all("index.html")


if __name__ == "__main__":
    app.run("0.0.0.0", port=8080)
