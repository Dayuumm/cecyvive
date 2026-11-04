from flask import Flask, render_template, request, jsonify
import mysql.connector
import qrcode
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configuración de la base de datos 'cecyvive'
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Deluna182809',
    'database': 'cecyvive'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- VISTA PRINCIPAL & QR ---
def generar_qr():
    url_web = "http://127.0.0.1:5000/"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url_web)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#006837", back_color="white")
    
    os.makedirs('static', exist_ok=True)
    img.save("static/qr_cecyvive.png")
    print(">>> [INFO] Código QR generado con éxito en /static/qr_cecyvive.png")

@app.route('/')
def index():
    return render_template('index.html')

# --- API EVENTOS (LISTAR PUBLICO / ADMIN) ---
@app.route('/api/eventos', methods=['GET'])
def obtener_eventos():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT * FROM Evento ORDER BY id_E DESC")
        eventos_raw = cursor.fetchall()
        
        eventos = []
        for evt in eventos_raw:
            evt['Fecha'] = str(evt['Fecha']) if evt.get('Fecha') else ''
            evt['Hora'] = str(evt['Hora']) if evt.get('Hora') else ''
            
            # Nombre del archivo de imagen
            nombre_img = evt.get('Imagen')
            if not nombre_img or str(nombre_img).strip() == '':
                nombre_img = 'default_event.jpg'
            
            evt['Imagen'] = nombre_img
            
            # Asignar la propiedad 'image' formateada para el frontend JavaScript
            if nombre_img.startswith('/') or nombre_img.startswith('http'):
                evt['image'] = nombre_img
            else:
                # Si guardas en static/uploads cambia 'uploads' por la carpeta correspondiente
                evt['image'] = f'/static/uploads/{nombre_img}'
                
            eventos.append(evt)

        cursor.close()
        conn.close()
        return jsonify({'success': True, 'eventos': eventos})
    except Exception as e:
        print(">>> ERROR AL OBTENER EVENTOS:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

# --- API ESTUDIANTES (REGISTRO & LOGIN) ---
@app.route('/api/registrar-estudiante', methods=['POST'])
def registrar_estudiante():
    data = request.json or {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT IFNULL(MAX(id), 0) + 1 FROM Estudiantes")
        nuevo_id = cursor.fetchone()[0]
        
        query = """INSERT INTO Estudiantes (id, Matricula, Nombre, Carrera, Grupo_Semestre, Correo) 
                   VALUES (%s, %s, %s, %s, %s, %s)"""
        values = (
            nuevo_id, 
            data.get('Matricula'), 
            data.get('Nombre'), 
            data.get('Carrera'), 
            data.get('Grupo_Semestre'), 
            data.get('Correo')
        )
        
        cursor.execute(query, values)
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': f'¡Estudiante guardado en MySQL con ID #{nuevo_id}!'})
    except Exception as e:
        print(">>> ERROR DE MYSQL EN REGISTRO:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/login-estudiante', methods=['POST'])
def login_estudiante():
    data = request.json or {}
    matricula = str(data.get('Matricula', '')).strip()
    
    if not matricula:
        return jsonify({'success': False, 'message': 'Por favor ingresa tu matrícula.'}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        cursor.execute("SELECT * FROM Estudiantes WHERE TRIM(Matricula) = %s", (matricula,))
        estudiante = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if estudiante:
            return jsonify({
                'success': True, 
                'message': f'¡Bienvenido de nuevo, {estudiante["Nombre"]}!', 
                'estudiante': estudiante
            })
        else:
            return jsonify({'success': False, 'message': 'Matrícula no encontrada. Por favor regístrate primero.'}), 404
            
    except Exception as e:
        print(">>> ERROR EN LOGIN:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/perfil/<matricula>', methods=['GET'])
def obtener_perfil(matricula):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        matricula_limpia = str(matricula).strip()
        
        cursor.execute("SELECT * FROM Estudiantes WHERE TRIM(Matricula) = %s", (matricula_limpia,))
        estudiante = cursor.fetchone()
        
        if not estudiante:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Estudiante no encontrado'}), 404

        query_evts = """
            SELECT e.id_E, e.Nombre_E, e.categoria, e.Fecha, e.Hora, e.Lugar, a.clave 
            FROM Asignacion a
            JOIN Evento e ON a.Event_id = e.id_E
            WHERE a.estud_id = %s
        """
        cursor.execute(query_evts, (estudiante['id'],))
        eventos_raw = cursor.fetchall()
        
        eventos = []
        for evt in eventos_raw:
            evt['Fecha'] = str(evt['Fecha']) if evt.get('Fecha') else ''
            evt['Hora'] = str(evt['Hora']) if evt.get('Hora') else ''
            eventos.append(evt)
        
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'estudiante': estudiante, 'eventos': eventos})
    except Exception as e:
        print(">>> ERROR EN PERFIL:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

# --- INSCRIPCIÓN Y BAJA DE EVENTOS ---
@app.route('/api/inscribir-evento', methods=['POST'])
def inscribir_evento():
    data = request.get_json(silent=True) or {}
    usuario_id = data.get('usuario_id') or data.get('User_id') or data.get('estud_id')
    evento_id = data.get('evento_id') or data.get('Event_id')

    if not usuario_id or not evento_id:
        return jsonify({'success': False, 'message': 'Faltan IDs requeridos'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        cursor.execute("SELECT id FROM Estudiantes WHERE id = %s", (usuario_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': f'El estudiante con ID #{usuario_id} no existe.'}), 400

        cursor.execute("SELECT id_E FROM Evento WHERE id_E = %s", (evento_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': f'El evento con ID #{evento_id} no existe.'}), 400

        cursor.execute("SELECT COALESCE(MAX(clave), 0) + 1 AS next_clave FROM Asignacion")
        next_clave = cursor.fetchone()['next_clave']

        cursor.execute(
            "INSERT INTO Asignacion (clave, estud_id, Event_id) VALUES (%s, %s, %s)",
            (next_clave, usuario_id, evento_id)
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': '¡Inscripción realizada con éxito!'})
    except Exception as e:
        print(">>> ERROR EN INSCRIPCIÓN:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 400

@app.route('/api/cancelar-inscripcion', methods=['POST'])
def cancelar_inscripcion():
    data = request.json or {}
    estud_id = data.get('estud_id')
    event_id = data.get('event_id')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(buffered=True)
        query = "DELETE FROM Asignacion WHERE estud_id = %s AND Event_id = %s"
        cursor.execute(query, (estud_id, event_id))
        conn.commit()
        
        affected_rows = cursor.rowcount
        cursor.close()
        conn.close()
        
        if affected_rows > 0:
            return jsonify({'success': True, 'message': 'Te has dado de baja del evento correctamente.'})
        else:
            return jsonify({'success': False, 'message': 'No se encontró la inscripción para eliminar.'}), 404
    except Exception as e:
        print(">>> ERROR AL DAR DE BAJA:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

# --- PANEL ADMIN (ESTUDIANTES, EVENTOS CRUD & AVISOS) ---
@app.route('/api/admin/estudiantes', methods=['GET'])
def obtener_estudiantes_admin():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        query = """
            SELECT e.id, e.Nombre, e.Matricula, e.Carrera, e.Grupo_Semestre, e.Correo,
                   GROUP_CONCAT(ev.Nombre_E SEPARATOR ', ') AS eventos_asignados
            FROM Estudiantes e
            LEFT JOIN Asignacion a ON e.id = a.estud_id
            LEFT JOIN Evento ev ON a.Event_id = ev.id_E
            GROUP BY e.id
        """
        cursor.execute(query)
        estudiantes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'estudiantes': estudiantes})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/api/admin/crear-evento', methods=['POST'])
def crear_evento():
    try:
        nombre = request.form.get('Nombre_E')
        categoria = request.form.get('categoria')
        fecha = request.form.get('Fecha')
        hora = request.form.get('Hora')
        lugar = request.form.get('Lugar')
        cupo = request.form.get('Cupo')
        desc = request.form.get('Desc')
        
        # Procesar la imagen subida desde el formulario
        filename = 'default_event.jpg'
        
        # Si enviaron un archivo válido en el input tipo file
        if 'imagen' in request.files:
            file = request.files['imagen']
            if file and file.filename.strip() != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        
        cursor.execute("SELECT COALESCE(MAX(id_E), 0) + 1 AS next_id FROM Evento")
        next_id = cursor.fetchone()['next_id']

        query = """
            INSERT INTO Evento (id_E, Nombre_E, categoria, Fecha, Hora, Lugar, Cupo, `Desc`, Imagen)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (next_id, nombre, categoria, fecha, hora, lugar, cupo, desc, filename))
        conn.commit()
        cursor.close()
        conn.close()

        # Determinar la URL para JavaScript
        img_url = f'/static/uploads/{filename}' if filename != 'default_event.jpg' else 'https://placehold.co/600x400/006837/ffffff?text=CecyVive'

        nuevo_evento = {
            'id_E': next_id,
            'Nombre_E': nombre,
            'categoria': categoria,
            'Fecha': fecha,
            'Hora': hora,
            'Lugar': lugar,
            'Cupo': cupo,
            'Desc': desc,
            'Imagen': filename,
            'image': img_url
        }

        return jsonify({
            'success': True, 
            'message': f'¡Evento #{next_id} guardado correctamente!',
            'evento': nuevo_evento
        })
    except Exception as e:
        print(">>> ERROR AL CREAR EVENTO:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 400

@app.route('/api/admin/actualizar-evento/<int:id_E>', methods=['PUT', 'POST'])
def actualizar_evento(id_E):
    try:
        nombre = request.form.get('Nombre_E')
        categoria = request.form.get('categoria')
        fecha = request.form.get('Fecha')
        hora = request.form.get('Hora')
        lugar = request.form.get('Lugar')
        cupo = request.form.get('Cupo')
        desc = request.form.get('Desc')

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        if 'imagen' in request.files and request.files['imagen'].filename != '':
            file = request.files['imagen']
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                
                query = """
                    UPDATE Evento 
                    SET Nombre_E=%s, categoria=%s, Fecha=%s, Hora=%s, Lugar=%s, Cupo=%s, `Desc`=%s, Imagen=%s
                    WHERE id_E=%s
                """
                cursor.execute(query, (nombre, categoria, fecha, hora, lugar, cupo, desc, filename, id_E))
        else:
            query = """
                UPDATE Evento 
                SET Nombre_E=%s, categoria=%s, Fecha=%s, Hora=%s, Lugar=%s, Cupo=%s, `Desc`=%s
                WHERE id_E=%s
            """
            cursor.execute(query, (nombre, categoria, fecha, hora, lugar, cupo, desc, id_E))

        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': 'Evento actualizado exitosamente.'}), 200
    except Exception as e:
        print(">>> ERROR AL ACTUALIZAR EVENTO:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 400

@app.route('/api/admin/eliminar-evento/<int:id_E>', methods=['DELETE'])
def eliminar_evento(id_E):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM Asignacion WHERE Event_id = %s", (id_E,))
        cursor.execute("DELETE FROM Evento WHERE id_E = %s", (id_E,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'message': f'Evento #{id_E} eliminado correctamente.'}), 200
    except Exception as e:
        print(">>> ERROR AL ELIMINAR EVENTO:", str(e))
        return jsonify({'success': False, 'message': f'Error al eliminar: {str(e)}'}), 400

# API: CREAR AVISO ESCOLAR (ADAPTADO A TU TABLA AVISOS)
@app.route('/api/admin/crear-aviso', methods=['POST'])
def crear_aviso():
    try:
        data = request.get_json() or {}
        titulo = data.get('titulo')
        contenido = data.get('contenido')

        if not titulo or not contenido:
            return jsonify({'success': False, 'message': 'Título y contenido son obligatorios'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)

        # Insertar únicamente en las columnas que existen en la tabla
        query = """
            INSERT INTO Avisos (titulo, contenido)
            VALUES (%s, %s)
        """
        cursor.execute(query, (titulo, contenido))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'success': True, 'message': '¡Aviso publicado correctamente!'})
    except Exception as e:
        print(">>> ERROR AL PUBLICAR AVISO:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 500

# API: OBTENER TODOS LOS AVISOS DE MYSQL
@app.route('/api/avisos', methods=['GET'])
def obtener_avisos():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT * FROM Avisos ORDER BY id_aviso DESC")
        avisos_raw = cursor.fetchall()
        cursor.close()
        conn.close()

        avisos = []
        for av in avisos_raw:
            avisos.append({
                'id': av.get('id_aviso'),
                'title': av.get('titulo') or 'Comunicado Escolar',
                'content': av.get('contenido') or '',
                'type': 'Informativo',
                'author': 'Dirección Plantel Tenango del Valle',
                'date': str(av.get('fecha')).split(' ')[0] if av.get('fecha') else ''
            })

        return jsonify({'success': True, 'avisos': avisos})
    except Exception as e:
        print(">>> ERROR AL OBTENER AVISOS:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

# --- INICIO DE APLICACION ---
if __name__ == '__main__':
    generar_qr()
    app.run(debug=True, port=5000)