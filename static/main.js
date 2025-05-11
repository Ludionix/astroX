// История навигации для возврата по Escape
let historyStack = ['/'];

// Обработка клавиш для навигации
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyStack.length > 1) {
        historyStack.pop();
        window.location.href = historyStack[historyStack.length - 1];
    }
    const menu = document.getElementById('menu');
    if (menu) {
        const buttons = menu.querySelectorAll('button');
        if (e.key >= '1' && e.key <= '9' && parseInt(e.key) <= buttons.length) {
            buttons[parseInt(e.key) - 1].click();
        }
    }
});

// Переход по URL с сохранением истории
function goTo(url) {
    historyStack.push(window.location.pathname);
    window.location.href = url;
}

// Загрузка главного меню
function loadMainMenu() {
    const menu = document.getElementById('menu');
    if (menu) {
        menu.setAttribute('data-level', 'main');
        menu.innerHTML = `
            <button role="menuitem" onclick="goTo('/experiments')">1. Эксперименты</button>
            <button role="menuitem" onclick="goTo('/theory')">2. Теория</button>
        `;
    }
}

// Загрузка меню экспериментов
function loadExperiments() {
    const menu = document.getElementById('menu');
    if (menu) {
        menu.setAttribute('data-level', 'experiments');
        menu.innerHTML = `
            <button role="menuitem" onclick="goTo('/experiments/gravity')">1. Симуляция гравитации</button>
            <button role="menuitem" onclick="goTo('/experiments/images')">2. Сонификация изображений</button>
        `;
    }
}

// Загрузка меню теории
function loadTheory() {
    const menu = document.getElementById('menu');
    if (menu) {
        menu.setAttribute('data-level', 'theory');
        menu.innerHTML = `
            <button role="menuitem" onclick="loadCategory('solar_system')">1. Объекты Солнечной системы</button>
            <button role="menuitem" onclick="loadCategory('universe')">2. Объекты Вселенной</button>
        `;
    }
}

// Заг Historic load of theory categories
function loadCategory(category) {
    fetch(`/theory/${category}`)
        .then(res => res.json())
        .then(data => showTheoryList(category, data.objects));
}

// Отображение списка объектов теории
function showTheoryList(category, objects) {
    const menu = document.getElementById('menu');
    const itemsPerPage = 9;
    let currentPage = 0;

    function renderPage(page) {
        const start = page * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = objects.slice(start, end);
        
        menu.innerHTML = pageItems.map((obj, i) => {
            if (obj.type === 'item') {
                return `<button role="menuitem" onclick="goTo('/theory/${category}/${obj.name}')">${start + i + 1}. ${obj.name}</button>`;
            } else {
                return `<button role="menuitem" onclick="showSubmenu('${category}', ${JSON.stringify(obj.items)})">${start + i + 1}. ${obj.name} (подменю)</button>`;
            }
        }).join('');

        if (objects.length > itemsPerPage) {
            const pagination = document.createElement('div');
            pagination.className = 'pagination';
            pagination.innerHTML = `
                <button ${currentPage === 0 ? 'disabled' : ''} onclick="renderPage(0)">1</button>
                <button ${currentPage === 1 || objects.length <= itemsPerPage ? 'disabled' : ''} onclick="renderPage(1)">2</button>
            `;
            menu.appendChild(pagination);
        }
    }

    renderPage(currentPage);
}

// Отображение подменю теории
function showSubmenu(category, items) {
    const menu = document.getElementById('menu');
    menu.innerHTML = items.map((item, i) => 
        `<button role="menuitem" onclick="goTo('/theory/${category}/${item}')">${i + 1}. ${item}</button>`
    ).join('');
}

// Инициализация меню при загрузке страницы
if (document.getElementById('menu')) {
    const level = document.getElementById('menu').getAttribute('data-level');
    if (level === 'main') loadMainMenu();
    if (level === 'experiments') loadExperiments();
    if (level === 'theory') loadTheory();
}