from flask import Flask, request, jsonify, render_template
from simulations.gravity import simulate_gravity
import requests
import io
from PIL import Image
import numpy as np
import os

app = Flask(__name__, static_folder='static', template_folder='templates')

# Главная страница
@app.route('/')
def index():
    return render_template('index.html')

# Страница экспериментов
@app.route('/experiments')
def experiments():
    return render_template('index.html', level='experiments')

# Страница теории
@app.route('/theory')
def theory():
    return render_template('index.html', level='theory')

# Страница симуляции гравитации
@app.route('/experiments/gravity')
def gravity_page():
    return render_template('gravity.html')

# Запуск симуляции гравитации
@app.route('/experiments/gravity/start', methods=['POST'])
def start_gravity():
    data = request.json.get('bodies', [])
    return simulate_gravity(data, dt=0.1)

# Шаг симуляции гравитации
@app.route('/experiments/gravity/step', methods=['GET'])
def gravity_step():
    dt = float(request.args.get('dt', 0.1))
    return simulate_gravity(None, dt)

# Страница сонификации изображений
@app.route('/experiments/images')
def images_page():
    nasa_api_key = "vYzBqHhdwl4zxSNF4enBTVKAIsHMw873XZ2ojsJR"
    url = f"https://images-api.nasa.gov/search?q=galaxy&media_type=image&api_key={nasa_api_key}"
    images = []
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        items = data.get('collection', {}).get('items', [])
        images = [{'id': item['data'][0]['nasa_id'], 'title': item['data'][0]['title'], 
                   'description': item['data'][0].get('description', 'Нет описания')[:100], 
                   'url': item['links'][0]['href'] if 'links' in item else ''} 
                  for item in items[:5]]
    except requests.RequestException as e:
        print(f"Ошибка загрузки данных NASA: {str(e)}")
        image_dir = os.path.join(os.getcwd(), 'images')
        if os.path.exists(image_dir):
            local_images = [f for f in os.listdir(image_dir) if f.endswith(('.jpg', '.png'))]
            images = [{'id': f, 'title': f, 'description': f'Локальное изображение: {f}', 
                       'url': f'/static/images/{f}'} for f in local_images[:5]]
    return render_template('images.html', images=images)

# API для сонификации изображения
@app.route('/experiments/image/sonify', methods=['GET'])
def image_sonify():
    image_id = request.args.get('image_id')
    if image_id.startswith('http'):  # NASA URL
        try:
            img_data = requests.get(image_id, timeout=10).content
            img = Image.open(io.BytesIO(img_data)).convert('RGB')
            image_url = image_id
        except Exception as e:
            print(f"Ошибка загрузки NASA изображения: {str(e)}")
            image_dir = os.path.join(os.getcwd(), 'images')
            local_images = [f for f in os.listdir(image_dir) if f.endswith(('.jpg', '.png'))]
            img = Image.open(os.path.join(image_dir, local_images[0])).convert('RGB')
            image_url = f'/static/images/{local_images[0]}'
    else:  # Локальный файл
        image_path = os.path.join(os.getcwd(), 'images', image_id.split('/')[-1])
        img = Image.open(image_path).convert('RGB')
        image_url = f'/static/images/{image_id.split("/")[-1]}'

    img = img.resize((100, 100))
    pixels = np.array(img)
    
    # Генерация звуковых данных
    sound_data = []
    for x in range(pixels.shape[1]):
        brightness = np.mean(pixels[:, x]) / 255
        r, g, b = pixels[:, x].mean(axis=0) / 255
        note = int(60 + brightness * 24)  # MIDI ноты от 60 (C4) до 84 (C6)
        pan = (x / 100) * 2 - 1
        # Выбор инструмента по доминирующему цвету
        if r > g and r > b:
            instrument = 'piano'  # Красный
        elif g > r and g > b:
            instrument = 'strings'  # Зелёный
        elif b > r and b > g:
            instrument = 'flute'  # Синий
        elif r > b and g > b and abs(r - g) < 0.2:
            instrument = 'brass'  # Жёлтый
        else:
            instrument = 'piano'  # По умолчанию
        sound_data.append({'note': note, 'pan': pan, 'instrument': instrument})
    
    return jsonify({'sound_data': sound_data, 'description': f'Сонификация {image_id}', 'url': image_url})

# Список объектов теории
@app.route('/theory/<category>')
def theory_list(category):
    objects = {
        'solar_system': [
            {'name': 'Солнце', 'type': 'item'},
            {'name': 'Земля', 'type': 'item'},
            {'name': 'Юпитер', 'type': 'item'},
            {'name': 'Марс', 'type': 'item'},
            {'name': 'Венера', 'type': 'item'},
            {'name': 'Сатурн', 'type': 'item'},
            {'name': 'Уран', 'type': 'item'},
            {'name': 'Нептун', 'type': 'item'},
            {'name': 'Карликовые планеты', 'type': 'submenu', 'items': ['Плутон', 'Церера', 'Эрида']}
        ],
        'universe': [
            {'name': 'Млечный Путь', 'type': 'item'},
            {'name': 'Чёрная дыра', 'type': 'item'},
            {'name': 'Квазар', 'type': 'item'},
            {'name': 'Пульсар', 'type': 'item'},
            {'name': 'Сверхновая', 'type': 'item'},
            {'name': 'Туманность Ориона', 'type': 'item'},
            {'name': 'Экзопланета', 'type': 'item'},
            {'name': 'Андромеда', 'type': 'item'},
            {'name': 'Другие объекты', 'type': 'submenu', 'items': ['Спиральная галактика', 'Эллиптическая галактика']}
        ]
    }
    return jsonify({'objects': objects.get(category, [])})

# Страница теории для конкретного объекта
@app.route('/theory/<category>/<article>')
def get_theory(category, article):
    url = f"https://ru.wikipedia.org/w/api.php?action=parse&page={article}&format=json&prop=text"
    response = requests.get(url).json()
    html_content = response['parse']['text']['*'] if 'parse' in response else '<p>Статья не найдена</p>'
    return render_template('theory.html', content=html_content, title=article, category=category)

if __name__ == '__main__':
    app.run(debug=True)