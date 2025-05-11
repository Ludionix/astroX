import numpy as np
from flask import jsonify

# Условный коэффициент гравитации
K = 1000

class Body:
    def __init__(self, mass, x, y, vx, vy, tone, id):
        self.mass = mass
        self.pos = np.array([x, y], dtype=np.float64)
        self.vel = np.array([vx, vy], dtype=np.float64)
        self.acc = np.array([0.0, 0.0], dtype=np.float64)
        self.tone = tone
        self.id = id

# Глобальный список тел
bodies = []

# Симуляция гравитации
def simulate_gravity(data, dt):
    global bodies
    if data:
        bodies = [Body(
            b['mass'], b['x'], b['y'], 
            b['vx'], b['vy'], b['tone'], b['id']
        ) for b in data]
    
    if not bodies:
        return jsonify({'positions': []})
    
    forces = [np.zeros(2, dtype=np.float64) for _ in bodies]
    
    # Расчёт сил между телами
    for i, b1 in enumerate(bodies):
        for j, b2 in enumerate(bodies):
            if i < j and b1.mass > 0 and b2.mass > 0:
                r = b2.pos - b1.pos
                dist = np.linalg.norm(r)
                if dist > 10:  # Минимальное расстояние для избежания деления на ноль
                    force = K * b1.mass * b2.mass * r / (dist ** 3)
                    forces[i] += force
                    forces[j] -= force
    
    # Обновление позиций и скоростей
    for i, b in enumerate(bodies):
        if b.mass > 0:
            b.acc = forces[i] / b.mass
            b.vel += b.acc * dt
            b.pos += b.vel * dt
            b.acc = np.zeros(2)
    
    result = [{'x': float(b.pos[0]), 'y': float(b.pos[1]), 
               'vx': float(b.vel[0]), 'vy': float(b.vel[1]), 
               'tone': b.tone, 'mass': b.mass, 'id': b.id} 
              for b in bodies]
    return jsonify({'positions': result})