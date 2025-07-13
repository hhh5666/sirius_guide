from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    assets_dir = os.path.join(os.path.dirname(__file__), '../frontend/assets')
    return send_from_directory(assets_dir, filename)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '../frontend/assets')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_data(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/places")
def get_places():
    return jsonify(load_data("data/places.json"))

@app.route("/api/reviews/<int:place_id>")
def get_reviews(place_id):
    reviews = load_data("data/reviews.json")
    filtered = [r for r in reviews if r["place_id"] == place_id]
    return jsonify(filtered)

@app.route("/api/add_place", methods=["POST"])
def add_place():
    # Если данные из multipart/form-data
    if 'photo' not in request.files:
        return jsonify({"success": False, "error": "Фото не загружено"}), 400
    file = request.files['photo']
    if file.filename == '':
        return jsonify({"success": False, "error": "Имя файла пустое"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    else:
        return jsonify({"success": False, "error": "Недопустимый формат файла"}), 400

    # Остальные поля получаем из формы
    name = request.form.get("name")
    address = request.form.get("address")
    category = request.form.get("category")
    description = request.form.get("description")

    if not all([name, address, category, description]):
        return jsonify({"success": False, "error": "Не все поля заполнены"}), 400

    data = load_data("data/places.json")
    new_place = {
        "id": max([p["id"] for p in data] or [0]) + 1,
        "name": name,
        "address": address,
        "category": category,
        "photo": filename,
        "description": description
    }
    data.append(new_place)
    save_data("data/places.json", data)
    return jsonify({"success": True})

@app.route("/api/add_review", methods=["POST"])
def add_review():
    data = load_data("data/reviews.json")
    new_review = request.json
    new_review["date"] = datetime.today().strftime("%Y-%m-%d")
    data.append(new_review)
    save_data("data/reviews.json", data)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)