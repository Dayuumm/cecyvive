// Data inicial por defecto
const initialStudents = [];

const initialEvents = [
    { 
        id_E: 1, 
        Nombre_E: 'Certificación HTML5', 
        categoria: 'Academico', 
        Fecha: '2026-11-10', 
        Hora: '09:00:00', 
        Lugar: 'Salas de Cómputo 1 y 2', 
        Cupo: 30, 
        Desc: 'Certificación internacional ECMO273-HTML5 Application Development Fundamentals por Microsoft. Dirigido a 5° semestre de Programación.', 
        image: '/static/images/certificacion_html5.jpeg' 
    },
    { 
        id_E: 2, 
        Nombre_E: 'Certificación MOS 2019', 
        categoria: 'Academico', 
        Fecha: '2026-11-15', 
        Hora: '10:00:00', 
        Lugar: 'Sala de Cómputo 3', 
        Cupo: 40, 
        Desc: 'Certificación internacional Microsoft Office Specialist en Word, Excel y PowerPoint. Dirigido a alumnos de 1° y 2° semestre.', 
        image: '/static/images/certificacion_mos_2019.jpeg' 
    },
    { 
        id_E: 3, 
        Nombre_E: 'Curso de Inteligencia Artificial', 
        categoria: 'Academico', 
        Fecha: '2026-11-20', 
        Hora: '08:30:00', 
        Lugar: 'Salas de computo', 
        Cupo: 50, 
        Desc: 'Capacitación en desarrollo de habilidades, proyectos interactivos y fundamentos de IA para estudiantes.', 
        image: '/static/images/curso_ia.jpeg' 
    },
    { 
        id_E: 4, 
        Nombre_E: 'Inscripciones Deportivas CECYTEM', 
        categoria: 'Deportivo', 
        Fecha: '2026-11-25', 
        Hora: '09:00:00', 
        Lugar: 'Canchas y Explanada del Plantel', 
        Cupo: 100, 
        Desc: 'Torneo y disciplinas intergrupales de Fútbol, Básquetbol y Voleibol. Demuestra tu talento y compromiso Jaguar.', 
        image: '/static/images/inscripciones_deportivas.jpeg' 
    }
];

const initialAssignments = [
    { clave: 1, estud_id: 1, Event_id: 1 },
    { clave: 2, estud_id: 3, Event_id: 4 },
    { clave: 3, estud_id: 4, Event_id: 2 },
    { clave: 4, estud_id: 2, Event_id: 3 }
];

const initialNotices = [
    { id: 'n1', title: 'Inscripciones Abiertas a Actividades CecyVive', type: 'Urgente', author: 'Dirección CECYTEM Tenango del Valle', date: '2026-09-22', content: 'Se invita a todos los estudiantes a inscribirse oportunamente a las disciplinas deportivas, tecnológicas y culturales del semestre.' },
    { id: 'n2', title: 'Portación del Uniforme Institucional Verde', type: 'Informativo', author: 'Subdirección Escolar', date: '2026-09-19', content: 'Se solicita portar el uniforme oficial verde del plantel al presentarse en los eventos convocados.' }
];

const initialGallery = [
    { id: 'g1', title: 'Curso de Inteligencia Artificial', category: 'Academico', image: '/static/images/curso_ia.jpeg', desc: 'Alumnos participando en las sesiones del curso de IA.' },
    { id: 'g2', title: 'Inscripciones Deportivas', category: 'Deportivo', image: '/static/images/inscripciones_deportivas.jpeg', desc: 'Proceso de registro para las disciplinas deportivas del plantel.' },
    { id: 'g3', title: 'Certificación HTML5', category: 'Academico', image: '/static/images/certificacion_html5.jpeg', desc: 'Certificación ECMO273-HTML5 Application Development Fundamentals.' },
    { id: 'g4', title: 'Certificación MOS 2019', category: 'Academico', image: '/static/images/certificacion_mos_2019.jpeg', desc: 'Certificación internacional en el uso de Microsoft Office.' }
];

let students = [];
let events = [];
let assignments = [];
let notices = [];
let gallery = [];

let isAdminLoggedIn = false;
let currentCalendarDate = new Date(2026, 9, 1);
let calendarFilter = 'todos';
let activeUser = null;
let currentEventsList = [];

function loadState() {
    // Cargar avisos, estudiantes y galería de localStorage
    students = JSON.parse(localStorage.getItem('cecy_sql_students')) || initialStudents;
    assignments = JSON.parse(localStorage.getItem('cecy_sql_assignments')) || initialAssignments;
    notices = JSON.parse(localStorage.getItem('cecy_notices')) || initialNotices;
    gallery = JSON.parse(localStorage.getItem('cecy_gallery')) || initialGallery;
    
    const savedUser = localStorage.getItem('cecy_active_user');
    if (savedUser) {
        activeUser = JSON.parse(savedUser);
    }

    // Cargar los eventos de la base de datos MySQL
    loadEventsAndGallery();
}

function saveState() {
    localStorage.setItem('cecy_sql_students', JSON.stringify(students));
    localStorage.setItem('cecy_sql_events', JSON.stringify(events));
    localStorage.setItem('cecy_sql_assignments', JSON.stringify(assignments));
    localStorage.setItem('cecy_notices', JSON.stringify(notices));
    localStorage.setItem('cecy_gallery', JSON.stringify(gallery));
    refreshAllViews();
}

function resetDataToDefault() {
    if (confirm('¿Deseas restablecer los datos del portal al estado inicial del script SQL?')) {
        localStorage.clear();
        loadState();
        saveState();
        showToast('Base de datos restablecida correctamente', 'success');
    }
}

function switchTab(tabId) {
    if (tabId === 'perfil') tabId = 'inscripcion';

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-cecy-accent', 'bg-cecy-light/30');
        btn.classList.add('text-emerald-100');
    });

    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) selectedTab.classList.add('active');

    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn && tabId !== 'admin') {
        activeBtn.classList.add('text-cecy-accent', 'bg-cecy-light/30');
        activeBtn.classList.remove('text-emerald-100');
    }

    if (tabId === 'inscripcion' || tabId === 'registro-evento') {
        updateAuthUI();
    }

    if (tabId === 'avisos') {
        loadAvisos();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function refreshAllViews() {
    renderHomeFeatured();
    renderCalendar();
    renderEventsGrid();
    renderNotices();
    renderGallery();
    renderAdminTables();
    checkUserRegistrationStatus();
}

function checkUserRegistrationStatus() {
    const navBtn = document.getElementById('nav-registro-evento');
    const registerView = document.getElementById('user-register-view');
    const profileView = document.getElementById('user-profile-view');
    const navUserBtnText = document.getElementById('nav-inscripcion');

    if (activeUser) {
        if (navBtn) {
            navBtn.classList.remove('hidden');
            navBtn.classList.add('flex');
        }
        if (navUserBtnText) {
            navUserBtnText.innerHTML = `<i class="fa-solid fa-user-check text-xs"></i> Mi Perfil`;
        }
        if (registerView) registerView.classList.add('hidden');
        if (profileView) {
            profileView.classList.remove('hidden');
            renderActiveUserProfile();
        }
    } else {
        if (navBtn) {
            navBtn.classList.add('hidden');
            navBtn.classList.remove('flex');
        }
        if (navUserBtnText) {
            navUserBtnText.innerHTML = `<i class="fa-solid fa-user-plus text-xs"></i> Registro Usuario`;
        }
        if (registerView) registerView.classList.remove('hidden');
        if (profileView) profileView.classList.add('hidden');
    }
}

function renderActiveUserProfile() {
    if (!activeUser) return;

    const elName = document.getElementById('my-profile-name');
    const elMatricula = document.getElementById('my-profile-matricula');
    const elId = document.getElementById('my-profile-id');
    const elCarrera = document.getElementById('my-profile-carrera');
    const elGrupo = document.getElementById('my-profile-grupo');
    const elCorreo = document.getElementById('my-profile-correo');

    if (elName) elName.innerText = activeUser.Nombre || '-';
    if (elMatricula) elMatricula.innerText = `Matrícula: ${activeUser.Matricula || '-'}`;
    if (elId) elId.innerText = `ID BD: #${activeUser.id || '1'}`;
    if (elCarrera) elCarrera.innerText = activeUser.Carrera || '-';
    if (elGrupo) elGrupo.innerText = activeUser.Grupo_Semestre || '-';
    if (elCorreo) elCorreo.innerText = activeUser.Correo || '-';

    const assignUserInput = document.getElementById('assign-user-id');
    if (assignUserInput) assignUserInput.value = activeUser.id || '';

    const eventsGrid = document.getElementById('my-assigned-events-grid');
    if (!eventsGrid) return;

    fetch(`/api/perfil/${activeUser.Matricula}`)
    .then(res => res.json())
    .then(data => {
        eventsGrid.innerHTML = '';

        if (!data.success || !data.eventos || data.eventos.length === 0) {
            eventsGrid.innerHTML = `
                <div class="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p class="text-slate-500 text-xs">Aún no te has inscrito a ningún evento.</p>
                    <button onclick="switchTab('eventos')" class="mt-2 text-xs text-cecy font-bold hover:underline">Ver eventos disponibles</button>
                </div>
            `;
            return;
        }

        data.eventos.forEach(evt => {
            const idEvt = evt.id_E || evt.id || '1';
            const nombreEvt = evt.Nombre_E || evt.nombre || 'Evento sin nombre';
            const catEvt = evt.categoria || 'General';
            const fechaEvt = evt.Fecha || '';
            const horaEvt = evt.Hora || '';
            const lugarEvt = evt.Lugar || 'Plantel';
            const claveAsig = evt.clave ? `#${evt.clave}` : '';

            eventsGrid.innerHTML += `
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-300 transition-colors">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="bg-cecy text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">id_E: #${idEvt}</span>
                            <span class="text-xs font-bold text-cecy uppercase tracking-wider">${catEvt}</span>
                        </div>
                        <h4 class="font-bold text-slate-900 text-base">${nombreEvt}</h4>
                        <p class="text-xs text-slate-500 mt-0.5">
                            <i class="fa-regular fa-calendar text-cecy mr-1"></i> ${fechaEvt} ${horaEvt ? `(${horaEvt})` : ''} | 
                            <i class="fa-solid fa-location-dot text-rose-500 mx-1"></i> ${lugarEvt}
                        </p>
                    </div>
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div class="flex flex-col items-start sm:items-end gap-1">
                            <span class="text-xs font-mono bg-emerald-100 text-cecy font-bold px-3 py-1.5 rounded-xl">Inscripción confirmada</span>
                            ${claveAsig ? `<span class="text-[10px] text-slate-400 font-mono">Clave Asig: ${claveAsig}</span>` : ''}
                        </div>
                        <button onclick="darDeBajaEvento(${idEvt})" class="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold px-3 py-2 rounded-xl transition-colors border border-rose-200 flex items-center gap-1 self-stretch sm:self-auto justify-center">
                            <i class="fa-solid fa-trash-can text-xs"></i> Darse de baja
                        </button>
                    </div>
                </div>
            `;
        });
    })
    .catch(err => {
        console.error("Error al cargar los eventos del perfil:", err);
    });
}

function handleEventAssignmentSubmit(e) {
    e.preventDefault();

    const userIdVal = document.getElementById('assign-user-id').value;
    const eventIdVal = document.getElementById('assign-event-id').value;

    if (!userIdVal || !eventIdVal) {
        showToast('Por favor llena ambos campos de ID', 'error');
        return;
    }

    const payload = {
        usuario_id: parseInt(userIdVal, 10),
        evento_id: parseInt(eventIdVal, 10)
    };

    fetch('/api/inscribir-evento', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Error en la petición');
        }
        return data;
    })
    .then(result => {
        showToast(result.message, 'success');
        document.getElementById('assign-event-id').value = '';
        renderActiveUserProfile();
    })
    .catch(err => {
        console.error(">>> Error al inscribir:", err);
        showToast(err.message, 'error');
    });
}

function getCategoryBadge(cat) {
    switch(cat) {
        case 'Deportivo': return 'bg-emerald-100 text-cecy border border-emerald-300';
        case 'Academico': return 'bg-blue-100 text-blue-900 border border-blue-200';
        case 'Cultural': return 'bg-purple-100 text-purple-900 border border-purple-200';
        default: return 'bg-slate-100 text-slate-800';
    }
}

function renderHomeFeatured() {
    const container = document.getElementById('home-featured-events');
    if (!container) return;
    container.innerHTML = '';

    const hasUsers = activeUser !== null;
    const featured = events.slice(0, 3);
    
    featured.forEach(evt => {
        const buttonHTML = hasUsers 
            ? `<button onclick="switchTab('registro-evento')" class="text-xs bg-cecy hover:bg-cecy-dark text-white font-bold px-3.5 py-2 rounded-xl transition-colors">Inscribirme</button>`
            : `<span class="text-[11px] text-slate-400 italic">Regístrate para inscribirte</span>`;

        container.innerHTML += `
            <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                    <div class="relative">
                        <img src="${evt.image || 'https://placehold.co/600x400/006837/ffffff?text=CecyVive'}" alt="${evt.Nombre_E}" class="h-48 w-full object-cover object-top">
                        <span class="absolute top-3 left-3 px-2.5 py-1 text-xs font-black rounded-lg shadow ${getCategoryBadge(evt.categoria)}">${evt.categoria}</span>
                        <span class="absolute top-3 right-3 px-2 py-1 bg-cecy-dark/80 text-cecy-accent font-mono text-[10px] font-black rounded-lg backdrop-blur-sm">id_E: #${evt.id_E}</span>
                    </div>
                    <div class="p-5">
                        <h3 class="font-display font-bold text-slate-900 text-base mb-2">${evt.Nombre_E}</h3>
                        <p class="text-slate-500 text-xs line-clamp-2 mb-4">${evt.Desc}</p>
                    </div>
                </div>
                <div class="px-5 pb-5 pt-0 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <span class="text-xs font-bold text-slate-600"><i class="fa-regular fa-calendar text-cecy mr-1"></i> ${evt.Fecha}</span>
                    ${buttonHTML}
                </div>
            </div>
        `;
    });
}

function renderEventsGrid(filteredList = null) {
    const container = document.getElementById('events-grid-container');
    if (!container) return;
    const list = filteredList || events;
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-400 font-medium">No se encontraron eventos coincidentes.</div>`;
        return;
    }

    list.forEach(evt => {
        // Formatear correctamente la URL de la imagen
        let imgUrl = 'https://placehold.co/600x400/006837/ffffff?text=CecyVive';
        const rawImg = evt.image || evt.Imagen;

        if (rawImg && rawImg.trim() !== '') {
            if (rawImg.startsWith('http') || rawImg.startsWith('/static')) {
                imgUrl = rawImg;
            } else {
                imgUrl = `/static/uploads/${rawImg}`;
            }
        }

        container.innerHTML += `
            <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                    <div class="relative">
                        <img src="${imgUrl}" alt="${evt.Nombre_E || 'Evento'}" class="h-48 w-full object-cover object-top" onerror="this.src='https://placehold.co/600x400/006837/ffffff?text=CecyVive'">
                        <span class="absolute top-3 left-3 px-3 py-1 text-xs font-black rounded-xl shadow ${getCategoryBadge(evt.categoria)}">${evt.categoria || 'General'}</span>
                        <span class="absolute top-3 right-3 px-2.5 py-1 bg-cecy-dark/80 text-cecy-accent font-mono text-xs font-black rounded-xl backdrop-blur-sm">ID: #${evt.id_E || evt.id}</span>
                    </div>
                    <div class="p-5">
                        <h3 class="font-display font-bold text-slate-900 text-lg mb-2">${evt.Nombre_E || evt.title || 'Evento'}</h3>
                        <p class="text-slate-600 text-sm mb-4 leading-relaxed">${evt.Desc || evt.desc || 'Sin descripción'}</p>
                        
                        <div class="space-y-2 text-xs text-slate-600 font-medium border-t border-slate-100 pt-3">
                            <div class="flex items-center gap-2"><i class="fa-solid fa-calendar text-cecy w-4"></i> Fecha: <span class="font-bold">${evt.Fecha || 'Por definir'}</span> (${evt.Hora || ''})</div>
                            <div class="flex items-center gap-2"><i class="fa-solid fa-location-dot text-rose-500 w-4"></i> Lugar: <span class="font-bold">${evt.Lugar || 'Plantel'}</span></div>
                            <div class="flex items-center gap-2"><i class="fa-solid fa-users text-amber-500 w-4"></i> Cupo Máximo: <span class="font-bold">${evt.Cupo || 0} personas</span></div>
                        </div>
                    </div>
                </div>
                <div class="p-5 pt-0">
                    <button onclick="switchTab('registro-evento')" class="w-full bg-cecy hover:bg-cecy-dark text-white font-extrabold py-3 rounded-xl transition-colors text-sm shadow">
                        Inscribirse a este Evento
                    </button>
                </div>
            </div>
        `;
    });
}

function applyEventFilters() {
    const search = document.getElementById('event-search-input').value.toLowerCase();
    const category = document.getElementById('event-category-select').value;

    const filtered = events.filter(e => {
        const matchSearch = e.Nombre_E.toLowerCase().includes(search) || e.Desc.toLowerCase().includes(search);
        const matchCat = category === 'todos' || e.categoria === category;
        return matchSearch && matchCat;
    });

    renderEventsGrid(filtered);
}

function renderCalendar() {
    const monthYearText = document.getElementById('calendar-month-year');
    const cellsContainer = document.getElementById('calendar-cells');
    if (!monthYearText || !cellsContainer) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYearText.innerText = `${monthNames[month]} ${year}`;

    cellsContainer.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        cellsContainer.innerHTML += `<div class="bg-slate-50/50 p-2 min-h-[70px]"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayEvents = events.filter(e => {
            const matchDate = e.Fecha === dateStr;
            const matchCat = calendarFilter === 'todos' || e.categoria === calendarFilter;
            return matchDate && matchCat;
        });

        let badges = '';
        dayEvents.forEach(evt => {
            badges += `
                <div class="text-[10px] p-1 mb-1 rounded-md bg-emerald-100 text-cecy-dark font-bold truncate cursor-pointer hover:bg-emerald-200" title="${evt.Nombre_E}" onclick="showDayDetails('${dateStr}')">
                    #${evt.id_E} ${evt.Nombre_E}
                </div>
            `;
        });

        cellsContainer.innerHTML += `
            <div class="p-2 min-h-[70px] bg-white hover:bg-emerald-50/30 border-t border-slate-100 transition-colors cursor-pointer" onclick="showDayDetails('${dateStr}')">
                <div class="font-bold text-xs text-slate-700 mb-1">${day}</div>
                ${badges}
            </div>
        `;
    }
}

function changeCalendarMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function resetCalendarToToday() {
    currentCalendarDate = new Date(2026, 9, 1);
    renderCalendar();
}

function filterCalendar(cat) {
    calendarFilter = cat;
    document.querySelectorAll('.calendar-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
            btn.classList.add('bg-cecy', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-600');
        } else {
            btn.classList.remove('bg-cecy', 'text-white');
            btn.classList.add('bg-white', 'text-slate-600');
        }
    });
    renderCalendar();
}

function showDayDetails(dateStr) {
    const container = document.getElementById('calendar-selected-day-details');
    const list = document.getElementById('calendar-day-events-list');
    if (!container || !list) return;
    
    const dayEvts = events.filter(e => e.Fecha === dateStr);
    if (dayEvts.length === 0) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    list.innerHTML = '';
    dayEvts.forEach(e => {
        list.innerHTML += `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center">
                <div>
                    <span class="text-xs font-extrabold text-cecy">[ID #${e.id_E} - ${e.categoria}]</span>
                    <h5 class="font-bold text-sm text-slate-800">${e.Nombre_E}</h5>
                    <p class="text-xs text-slate-500">${e.Hora} hrs | Lugar: ${e.Lugar}</p>
                </div>
                <button onclick="switchTab('registro-evento')" class="text-xs bg-cecy hover:bg-cecy-dark text-white font-bold px-3 py-1.5 rounded-lg">Inscribirme</button>
            </div>
        `;
    });
}

function renderNotices() {
    const container = document.getElementById('notices-container');
    if (!container) return;
    container.innerHTML = '';

    if (notices.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm col-span-full">No hay avisos publicados por el momento.</p>`;
        return;
    }

    notices.forEach(n => {
        const isUrgent = n.type === 'Urgente';
        container.innerHTML += `
            <div class="bg-white rounded-3xl p-6 shadow-sm border ${isUrgent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}">
                <div class="flex items-center justify-between mb-3">
                    <span class="px-3 py-1 text-xs font-black rounded-full ${isUrgent ? 'bg-amber-500 text-white' : 'bg-cecy text-white'}">${n.type}</span>
                    <span class="text-xs text-slate-400 font-medium">${n.date}</span>
                </div>
                <h3 class="font-display font-bold text-slate-900 text-lg mb-2">${n.title}</h3>
                <p class="text-slate-600 text-sm mb-4 leading-relaxed">${n.content}</p>
                <div class="text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span><i class="fa-solid fa-school text-cecy mr-1"></i> ${n.author}</span>
                </div>
            </div>
        `;
    });
}

function renderGallery(filterCategory = 'todos') {
    const container = document.getElementById('gallery-container');
    if (!container) return;
    container.innerHTML = '';

    const items = filterCategory === 'todos' ? gallery : gallery.filter(g => g.category === filterCategory);

    items.forEach(item => {
        container.innerHTML += `
            <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 group cursor-pointer" onclick="openLightbox('${item.image}', '${item.title}', '${item.desc}')">
                <div class="relative overflow-hidden">
                    <img src="${item.image}" alt="${item.title}" class="h-52 w-full object-cover object-top group-hover:scale-105 transition-transform duration-300">
                    <div class="absolute inset-0 bg-cecy-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm">
                        <i class="fa-solid fa-magnifying-glass-plus text-2xl text-cecy-accent"></i>
                    </div>
                </div>
                <div class="p-4">
                    <span class="text-[10px] font-black text-cecy uppercase tracking-wider">${item.category}</span>
                    <h4 class="font-display font-bold text-slate-900 text-base mt-0.5">${item.title}</h4>
                    <p class="text-xs text-slate-500 mt-1">${item.desc}</p>
                </div>
            </div>
        `;
    });
}

function filterGallery(cat) {
    document.querySelectorAll('.gallery-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
            btn.classList.add('bg-cecy', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-600');
        } else {
            btn.classList.remove('bg-cecy', 'text-white');
            btn.classList.add('bg-white', 'text-slate-600');
        }
    });
    renderGallery(cat);
}

function openLightbox(src, title, desc) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox-title').innerText = title;
    document.getElementById('lightbox-desc').innerText = desc;
    document.getElementById('lightbox-modal').classList.remove('hidden');
    document.getElementById('lightbox-modal').classList.add('flex');
}

function closeLightbox() {
    document.getElementById('lightbox-modal').classList.add('hidden');
    document.getElementById('lightbox-modal').classList.remove('flex');
}

function verifyAdminPass(e) {
    e.preventDefault();
    const pass = document.getElementById('admin-password-input').value;
    if (pass === 'cecytem2026') {
        isAdminLoggedIn = true;
        document.getElementById('admin-auth-card').classList.add('hidden');
        document.getElementById('admin-main-content').classList.remove('hidden');
        showToast('Acceso al panel administrativo concedido', 'success');
    } else {
        showToast('Clave incorrecta. Intente de nuevo.', 'error');
    }
}

function lockAdmin() {
    isAdminLoggedIn = false;
    document.getElementById('admin-password-input').value = '123';
    document.getElementById('admin-main-content').classList.add('hidden');
    document.getElementById('admin-auth-card').classList.remove('hidden');
}

function switchAdminSubtab(targetId) {
    document.querySelectorAll('.admin-subtab-content').forEach(el => el.classList.add('hidden'));

    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
        btn.classList.remove('border-cecy', 'text-cecy');
        btn.classList.add('border-transparent', 'text-slate-500');
    });

    const selectedContent = document.getElementById(`subtab-${targetId}`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    }

    if (targetId === 'admin-events') {
        document.getElementById('admin-tab-events-btn')?.classList.add('border-cecy', 'text-cecy');
        document.getElementById('admin-tab-events-btn')?.classList.remove('border-transparent', 'text-slate-500');
        loadEventsAndGallery();
    } else if (targetId === 'admin-regs') {
        document.getElementById('admin-tab-regs-btn')?.classList.add('border-cecy', 'text-cecy');
        document.getElementById('admin-tab-regs-btn')?.classList.remove('border-transparent', 'text-slate-500');
        loadAdminStudentsTable();
    } else if (targetId === 'admin-notices') {
        document.getElementById('admin-tab-notices-btn')?.classList.add('border-cecy', 'text-cecy');
        document.getElementById('admin-tab-notices-btn')?.classList.remove('border-transparent', 'text-slate-500');
        loadAvisos();
    }
}

function renderAdminTables() {
    const eventsBody = document.getElementById('admin-events-table-body');
    if (!eventsBody) return;
    eventsBody.innerHTML = '';
    events.forEach(e => {
        eventsBody.innerHTML += `
            <tr>
                <td class="p-3 font-mono font-bold text-cecy">#${e.id_E}</td>
                <td class="p-3 font-bold text-slate-800">${e.Nombre_E}</td>
                <td class="p-3"><span class="px-2 py-0.5 text-xs font-extrabold rounded ${getCategoryBadge(e.categoria)}">${e.categoria}</span></td>
                <td class="p-3 text-xs">${e.Fecha} (${e.Hora})</td>
                <td class="p-3 text-xs">${e.Lugar}</td>
                <td class="p-3 text-xs font-bold">${e.Cupo}</td>
                <td class="p-3 text-right space-x-2">
                    <button onclick="editEvent(${e.id_E})" class="text-cecy hover:text-cecy-dark font-bold text-xs"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteEvent(${e.id_E})" class="text-rose-600 hover:text-rose-800 font-bold text-xs"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    const regsBody = document.getElementById('admin-regs-table-body');
    if (!regsBody) return;
    regsBody.innerHTML = '';
    const badge = document.getElementById('admin-total-regs-badge');
    if (badge) badge.innerText = students.length;

    students.forEach(s => {
        const studentAssigs = assignments.filter(a => a.estud_id === s.id);
        const assignedEventNames = studentAssigs.map(a => {
            const ev = events.find(e => e.id_E === a.Event_id);
            return ev ? `#${ev.id_E} ${ev.Nombre_E}` : `Evento #${a.Event_id}`;
        }).join(', ');

        regsBody.innerHTML += `
            <tr>
                <td class="p-3 font-mono font-bold text-slate-700">#${s.id}</td>
                <td class="p-3 font-bold text-slate-800">${s.Nombre}</td>
                <td class="p-3 text-xs font-mono font-bold text-cecy">${s.Matricula}</td>
                <td class="p-3 text-xs font-medium">${s.Carrera} (Gpo: ${s.Grupo_Semestre})</td>
                <td class="p-3 text-xs">${s.Correo}</td>
                <td class="p-3 text-xs font-semibold text-slate-700">${assignedEventNames || '<span class="text-slate-400">Sin asignaciones</span>'}</td>
                <td class="p-3 text-right">
                    <button onclick="deleteStudent(${s.id})" class="text-rose-600 hover:text-rose-800 text-xs font-bold"><i class="fa-solid fa-user-minus"></i></button>
                </td>
            </tr>
        `;
    });
}

function deleteStudent(id) {
    if (confirm(`¿Eliminar al estudiante ID #${id}?`)) {
        students = students.filter(s => s.id !== id);
        assignments = assignments.filter(a => a.estud_id !== id);
        saveState();
        showToast('Estudiante eliminado de la base de datos', 'info');
    }
}

function handleSaveNotice(e) {
    e.preventDefault();
    const title = document.getElementById('admin-notice-title').value;
    const type = document.getElementById('admin-notice-type').value;
    const author = document.getElementById('admin-notice-author').value;
    const content = document.getElementById('admin-notice-content').value;

    const newNotice = {
        id: Date.now().toString(),
        title,
        type,
        author,
        date: new Date().toISOString().split('T')[0],
        content
    };

    notices.unshift(newNotice);
    saveState();
    e.target.reset();
    showToast('Aviso publicado', 'success');
}

function exportRegistrationsCSV() {
    if (students.length === 0) {
        showToast('No hay estudiantes para exportar', 'error');
        return;
    }

    let csv = "ID,Matricula,Nombre,Carrera,Grupo_Semestre,Correo,Eventos_Asignados\n";
    students.forEach(s => {
        const studentAssigs = assignments.filter(a => a.estud_id === s.id);
        const assignedEventNames = studentAssigs.map(a => {
            const ev = events.find(e => e.id_E === a.Event_id);
            return ev ? `#${ev.id_E} ${ev.Nombre_E}` : `Evento #${a.Event_id}`;
        }).join(' | ');

        csv += `"${s.id}","${s.Matricula}","${s.Nombre}","${s.Carrera}","${s.Grupo_Semestre}","${s.Correo}","${assignedEventNames}"\n`;
    });

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    link.setAttribute("download", `Estudiantes_CecyVive_Tenango_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tabla Estudiantes exportada en formato CSV', 'success');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    
    let bgClass = 'bg-slate-900 text-white';
    let icon = 'fa-circle-info';
    
    if (type === 'success') {
        bgClass = 'bg-emerald-700 text-white border border-emerald-500';
        icon = 'fa-circle-check';
    } else if (type === 'error') {
        bgClass = 'bg-rose-600 text-white';
        icon = 'fa-circle-exclamation';
    }

    toast.className = `pointer-events-auto px-4 py-3 rounded-2xl shadow-xl font-bold text-xs sm:text-sm flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

window.onload = function() {
    const savedUser = localStorage.getItem('activeUser');
    if (savedUser) {
        activeUser = JSON.parse(savedUser);
    }

    loadState();
    refreshAllViews();
    checkUserRegistrationStatus();
    updateAuthUI();
};

function darDeBajaEvento(eventId) {
    if (!activeUser) return;
    
    if (!confirm('¿Estás seguro de que deseas darte de baja de este evento?')) {
        return;
    }

    fetch('/api/cancelar-inscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            estud_id: activeUser.id,
            event_id: eventId
        })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            renderActiveUserProfile();
        } else {
            showToast(result.message || 'Error al dar de baja', 'error');
        }
    })
    .catch(err => {
        console.error("Error al cancelar inscripción:", err);
        showToast('Error de conexión con el servidor', 'error');
    });
}

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('form-login-estudiante');
    const regForm = document.getElementById('student-registration-form');
    const btnLogin = document.getElementById('btn-mode-login');
    const btnReg = document.getElementById('btn-mode-register');

    if (mode === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (regForm) regForm.classList.add('hidden');
        if (btnLogin) btnLogin.className = "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all bg-white text-cecy shadow-sm";
        if (btnReg) btnReg.className = "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all text-slate-500 hover:text-slate-900";
    } else {
        if (loginForm) loginForm.classList.add('hidden');
        if (regForm) regForm.classList.remove('hidden');
        if (btnReg) btnReg.className = "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all bg-white text-cecy shadow-sm";
        if (btnLogin) btnLogin.className = "flex-1 py-2.5 rounded-xl font-bold text-sm transition-all text-slate-500 hover:text-slate-900";
    }
}

function updateAuthUI() {
    const registerView = document.getElementById('user-register-view');
    const profileView = document.getElementById('user-profile-view');

    if (activeUser) {
        if (registerView) registerView.classList.add('hidden');
        if (profileView) profileView.classList.remove('hidden');
        renderActiveUserProfile();
    } else {
        if (registerView) registerView.classList.remove('hidden');
        if (profileView) profileView.classList.add('hidden');
    }
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const matriculaInput = document.getElementById('login-matricula');
    if (!matriculaInput) return;
    
    const matricula = matriculaInput.value.trim();

    fetch('/api/login-estudiante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Matricula: matricula })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            activeUser = result.estudiante;
            localStorage.setItem('activeUser', JSON.stringify(activeUser));
            updateAuthUI();
            switchTab('inscripcion');
        } else {
            showToast(result.message || 'Matrícula no encontrada', 'error');
        }
    })
    .catch(err => {
        console.error("Error en login:", err);
        showToast('Error de conexión con el servidor', 'error');
    });
}

function handleStudentRegistrationSubmit(e) {
    e.preventDefault();
    const data = {
        Nombre: document.getElementById('reg-name').value,
        Matricula: document.getElementById('reg-matricula').value.trim(),
        Carrera: document.getElementById('reg-carrera').value,
        Grupo_Semestre: document.getElementById('reg-grupo').value,
        Correo: document.getElementById('reg-correo').value
    };

    fetch('/api/registrar-estudiante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            document.getElementById('login-matricula').value = data.Matricula;
            handleLoginSubmit({ preventDefault: () => {} });
        } else {
            showToast(result.message || 'Error en el registro', 'error');
        }
    })
    .catch(err => {
        console.error("Error en registro:", err);
        showToast('Error al registrar estudiante', 'error');
    });
}

function logoutUser() {
    activeUser = null;
    localStorage.removeItem('activeUser');
    showToast('Sesión cerrada correctamente', 'info');
    updateAuthUI();
}

function inscribirseAEventoDirecto(idEvento) {
    if (!activeUser || !activeUser.id) {
        showToast('Debes iniciar sesión para inscribirte', 'error');
        switchTab('inscripcion');
        return;
    }

    fetch('/api/inscribir-evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_id: activeUser.id,
            evento_id: idEvento
        })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            renderActiveUserProfile();
        } else {
            showToast(result.message, 'error');
        }
    })
    .catch(err => showToast('Error al procesar la inscripción', 'error'));
}

function handleCreateAvisoSubmit(e) {
    e.preventDefault();
    
    const titulo = document.getElementById('admin-notice-title')?.value.trim();
    const tipo = document.getElementById('admin-notice-type')?.value || 'Informativo';
    const autor = document.getElementById('admin-notice-author')?.value.trim() || 'Dirección Plantel Tenango del Valle';
    const contenido = document.getElementById('admin-notice-content')?.value.trim();

    if (!titulo || !contenido) {
        showToast('Por favor completa el título y el mensaje del aviso', 'error');
        return;
    }

    fetch('/api/admin/crear-aviso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            titulo: titulo, 
            tipo: tipo,
            autor: autor,
            contenido: contenido 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('admin-notice-title').value = '';
            document.getElementById('admin-notice-content').value = '';
            
            // Si manejas avisos locales o desde servidor:
            if (typeof loadAvisos === 'function') loadAvisos();
            if (typeof renderNotices === 'function') renderNotices();
        } else {
            showToast(data.message || 'Error al publicar aviso', 'error');
        }
    })
    .catch(err => {
        console.error("Error publicando aviso:", err);
        showToast('Error de conexión al guardar el aviso', 'error');
    });
}

function loadAdminStudentsTable() {
    fetch('/api/admin/estudiantes')
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;

            const countBadge = document.getElementById('admin-student-count');
            const totalBadge = document.getElementById('admin-total-regs-badge');
            if (countBadge) countBadge.innerText = data.estudiantes.length;
            if (totalBadge) totalBadge.innerText = data.estudiantes.length;

            const tbody = document.getElementById('admin-students-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (data.estudiantes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">No hay alumnos registrados en la base de datos.</td></tr>`;
                return;
            }

            data.estudiantes.forEach(est => {
                tbody.innerHTML += `
                    <tr class="border-b border-slate-100 text-xs text-slate-700 hover:bg-slate-50">
                        <td class="p-3 font-mono font-bold">#${est.id}</td>
                        <td class="p-3 font-bold">${est.Nombre}</td>
                        <td class="p-3 font-mono">${est.Matricula}</td>
                        <td class="p-3">${est.Carrera} / ${est.Grupo_Semestre}</td>
                        <td class="p-3">${est.Correo}</td>
                        <td class="p-3 font-semibold text-cecy">${est.eventos_asignados || 'Sin eventos'}</td>
                    </tr>
                `;
            });
        })
        .catch(err => console.error("Error cargando tabla de estudiantes:", err));
}

// A. CARGAR Y RENDERIZAR EVENTOS Y GALERÍA (CON RUTA DE IMAGEN PROTEGIDA)
function loadEventsAndGallery() {
    fetch('/api/eventos')
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            const fetchedEvents = data.eventos || [];
            
            // Asignar los eventos de la BD MySQL a las variables globales
            events = fetchedEvents;
            currentEventsList = fetchedEvents;

            // Renderizar vistas dependientes
            renderEventsGrid();
            renderHomeFeatured();

            // Renderizar tabla del Administrador
            const tbody = document.getElementById('admin-events-table-body');
            if (tbody) {
                tbody.innerHTML = '';
                if (fetchedEvents.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">No hay eventos registrados.</td></tr>`;
                } else {
                    fetchedEvents.forEach(evt => {
                        tbody.innerHTML += `
                            <tr class="border-b border-slate-100 text-xs hover:bg-slate-50">
                                <td class="p-3 font-mono font-bold text-cecy">#${evt.id_E || evt.id}</td>
                                <td class="p-3 font-bold text-slate-800">${evt.Nombre_E || 'Sin nombre'}</td>
                                <td class="p-3">
                                    <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">${evt.categoria || 'General'}</span>
                                </td>
                                <td class="p-3 font-mono text-slate-500">${evt.Fecha || ''} (${evt.Hora || ''})</td>
                                <td class="p-3">${evt.Lugar || 'Plantel'}</td>
                                <td class="p-3 font-bold">${evt.Cupo || 0}</td>
                                <td class="p-3 text-right space-x-1">
                                    <button onclick="editEvent(${evt.id_E || evt.id})" class="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg"><i class="fa-solid fa-pen"></i></button>
                                    <button onclick="deleteEvent(${evt.id_E || evt.id})" class="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg"><i class="fa-solid fa-trash-can"></i></button>
                                </td>
                            </tr>
                        `;
                    });
                }
            }

            // Renderizar Galería
            const galleryContainer = document.getElementById('events-gallery-grid') || document.getElementById('gallery-container');
            if (galleryContainer) {
                galleryContainer.innerHTML = '';
                if (fetchedEvents.length === 0) {
                    galleryContainer.innerHTML = `<p class="col-span-full text-center text-slate-400 text-sm">No hay eventos para mostrar en la galería.</p>`;
                } else {
                    fetchedEvents.forEach(evt => {
                        let imgUrl = 'https://placehold.co/600x400/006837/ffffff?text=CecyVive';
                        const rawImg = evt.image || evt.Imagen;

                        if (rawImg && rawImg.trim() !== '') {
                            if (rawImg.startsWith('http') || rawImg.startsWith('/static')) {
                                imgUrl = rawImg;
                            } else {
                                imgUrl = `/static/uploads/${rawImg}`;
                            }
                        }

                        const idEvt = evt.id_E || evt.id || 'N/A';
                        const tituloEvt = evt.Nombre_E || evt.title || 'Evento CecyVive';
                        const descEvt = evt.Desc || evt.desc || 'Sin descripción';
                        const catEvt = evt.categoria || 'General';
                        const fechaEvt = evt.Fecha || 'Por definir';
                        const lugarEvt = evt.Lugar || 'Plantel CECYTEM';

                        galleryContainer.innerHTML += `
                            <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                                <div>
                                    <div class="h-52 overflow-hidden bg-slate-100 relative group cursor-pointer" onclick="openLightbox('${imgUrl}', '${tituloEvt}', '${descEvt}')">
                                        <img src="${imgUrl}" alt="${tituloEvt}" class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://placehold.co/600x400/006837/ffffff?text=CecyVive'">
                                        <span class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-cecy font-black text-[10px] uppercase px-2.5 py-1 rounded-full shadow-sm">
                                            ${catEvt}
                                        </span>
                                    </div>
                                    <div class="p-5 space-y-2">
                                        <span class="text-xs font-mono font-bold text-cecy">ID Evento: #${idEvt}</span>
                                        <h4 class="font-display font-bold text-slate-900 text-base leading-snug">${tituloEvt}</h4>
                                        <p class="text-xs text-slate-500 line-clamp-2">${descEvt}</p>
                                    </div>
                                </div>
                                <div class="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                    <span><i class="fa-regular fa-calendar text-cecy mr-1"></i>${fechaEvt}</span>
                                    <span><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${lugarEvt}</span>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        })
        .catch(err => console.error("Error al cargar eventos:", err));
}

function editEvent(id_E) {
    const evt = currentEventsList.find(e => e.id_E === id_E) || events.find(e => e.id_E === id_E);
    if (!evt) return;

    document.getElementById('admin-event-id').value = evt.id_E;
    document.getElementById('admin-event-title').value = evt.Nombre_E;
    document.getElementById('admin-event-category').value = evt.categoria;
    document.getElementById('admin-event-capacity').value = evt.Cupo;
    document.getElementById('admin-event-date').value = evt.Fecha;
    document.getElementById('admin-event-time').value = evt.Hora;
    document.getElementById('admin-event-location').value = evt.Lugar;
    document.getElementById('admin-event-desc').value = evt.Desc || '';

    document.getElementById('admin-event-form-title').innerText = `Editar Evento #${evt.id_E}`;
    document.getElementById('admin-cancel-edit-btn').classList.remove('hidden');

    document.getElementById('admin-event-form')?.scrollIntoView({ behavior: 'smooth' });
}

function cancelEventEdit() {
    document.getElementById('admin-event-id').value = '';
    document.getElementById('admin-event-form').reset();
    document.getElementById('admin-event-form-title').innerText = 'Agregar Evento Escolar';
    document.getElementById('admin-cancel-edit-btn').classList.add('hidden');
}

function handleSaveEvent(e) {
    e.preventDefault();
    const eventId = document.getElementById('admin-event-id').value;
    const form = document.getElementById('admin-event-form');
    const formData = new FormData(form);

    const isEdit = eventId !== '';
    const url = isEdit ? `/api/admin/actualizar-evento/${eventId}` : '/api/admin/crear-evento';

    fetch(url, {
        method: 'POST',
        body: formData // Envía los datos y la imagen seleccionada automáticamente
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            
            // 1. Limpiar el formulario y cancelar el modo edición si aplicaba
            form.reset();
            cancelEventEdit();
            
            // 2. Recargar todos los eventos e imágenes desde MySQL
            loadEventsAndGallery();
        } else {
            showToast(result.message, 'error');
        }
    })
    .catch(err => {
        console.error("Error guardando evento:", err);
        showToast('Error de conexión con el servidor', 'error');
    });
}

function deleteEvent(id_E) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el evento #${id_E}? Esto borrará también las inscripciones de este evento.`)) {
        return;
    }

    fetch(`/api/admin/eliminar-evento/${id_E}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            showToast(result.message, 'success');
            loadEventsAndGallery();
        } else {
            showToast(result.message, 'error');
        }
    })
    .catch(err => {
        console.error("Error al eliminar:", err);
        showToast('No se pudo eliminar el evento', 'error');
    });
}

function loadAvisos() {
    fetch('/api/avisos')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.avisos) {
                notices = data.avisos;
                
                // Pintar en el contenedor de Avisos
                const container = document.getElementById('notices-container');
                if (container) {
                    container.innerHTML = '';

                    if (notices.length === 0) {
                        container.innerHTML = `<p class="text-slate-400 text-sm col-span-full text-center py-8">No hay avisos registrados en la base de datos.</p>`;
                        return;
                    }

                    notices.forEach(n => {
                        container.innerHTML += `
                            <div class="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                                <div class="flex items-center justify-between mb-3">
                                    <span class="px-3 py-1 text-xs font-black rounded-full bg-cecy text-white">${n.type || 'Informativo'}</span>
                                    <span class="text-xs text-slate-400 font-medium">${n.date || ''}</span>
                                </div>
                                <h3 class="font-display font-bold text-slate-900 text-lg mb-2">${n.title}</h3>
                                <p class="text-slate-600 text-sm mb-4 leading-relaxed">${n.content}</p>
                                <div class="text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-between">
                                    <span><i class="fa-solid fa-school text-cecy mr-1"></i> ${n.author}</span>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        })
        .catch(err => console.error("Error al cargar avisos:", err));
}

// Renderizar la lista de avisos en el HTML
function renderNotices() {
    const container = document.getElementById('notices-container');
    if (!container) return;
    container.innerHTML = '';

    if (!notices || notices.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm col-span-full">No hay avisos publicados por el momento.</p>`;
        return;
    }

    notices.forEach(n => {
        const isUrgent = n.type === 'Urgente';
        container.innerHTML += `
            <div class="bg-white rounded-3xl p-6 shadow-sm border ${isUrgent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}">
                <div class="flex items-center justify-between mb-3">
                    <span class="px-3 py-1 text-xs font-black rounded-full ${isUrgent ? 'bg-amber-500 text-white' : 'bg-cecy text-white'}">${n.type || 'Informativo'}</span>
                    <span class="text-xs text-slate-400 font-medium">${n.date || ''}</span>
                </div>
                <h3 class="font-display font-bold text-slate-900 text-lg mb-2">${n.title || 'Aviso'}</h3>
                <p class="text-slate-600 text-sm mb-4 leading-relaxed">${n.content || ''}</p>
                <div class="text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span><i class="fa-solid fa-school text-cecy mr-1"></i> ${n.author || 'Dirección CECYTEM Tenango del Valle'}</span>
                </div>
            </div>
        `;
    });
}