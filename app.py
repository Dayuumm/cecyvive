import os
from flask import Flask, render_template, request, jsonify
import pymysql
from werkzeug.utils import secure_filename

base_dir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__, 
            template_folder=os.path.join(base_dir, 'templates'),
            static_folder=os.path.join(base_dir, 'static'))

# --- CONEXIÓN A BASE DE DATOS (Aiven / Local) ---
def get_db_connection():
    host = os.getenv('DB_HOST', 'mysql-3d3cfed3-soycecytem-ad37.e.aivencloud.com')
    user = os.getenv('DB_USER', 'avnadmin')
    password = os.getenv('DB_PASSWORD', '')
    database = os.getenv('DB_NAME', 'defaultdb')
    port = int(os.getenv('DB_PORT', 28896))

    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        port=port,
        cursorclass=pymysql.cursors.DictCursor
    )

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- VISTA PRINCIPAL ---
@app.route('/')
def index():
    return render_template('index.html')

# --- API EVENTOS ---
@app.route('/api/eventos', methods=['GET'])
def obtener_eventos():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Evento ORDER BY id_E DESC")
            eventos_raw = cursor.fetchall()
        conn.close()
        
        eventos = []
        for evt in eventos_raw:
            evt['Fecha'] = str(evt['Fecha']) if evt.get('Fecha') else ''
            evt['Hora'] = str(evt['Hora']) if evt.get('Hora') else ''
            
            nombre_img = evt.get('Imagen')
            if not nombre_img or str(nombre_img).strip() == '':
                nombre_img = 'default_event.jpg'
            
            evt['Imagen'] = nombre_img
            
            if nombre_img.startswith('/') or nombre_img.startswith('http'):
                evt['image'] = nombre_img
            else:
                evt['image'] = f'/static/uploads/{nombre_img}'
                
            eventos.append(evt)

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
        with conn.cursor() as cursor:
            cursor.execute("SELECT IFNULL(MAX(id), 0) + 1 AS next_id FROM Estudiantes")
            res = cursor.fetchone()
            nuevo_id = res['next_id'] if isinstance(res, dict) else res[0]
            
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
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Estudiantes WHERE TRIM(Matricula) = %s", (matricula,))
            estudiante = cursor.fetchone()
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
        with conn.cursor() as cursor:
            matricula_limpia = str(matricula).strip()
            
            cursor.execute("SELECT * FROM Estudiantes WHERE TRIM(Matricula) = %s", (matricula_limpia,))
            estudiante = cursor.fetchone()
            
            if not estudiante:
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
        conn.close()
        
        eventos = []
        for evt in eventos_raw:
            evt['Fecha'] = str(evt['Fecha']) if evt.get('Fecha') else ''
            evt['Hora'] = str(evt['Hora']) if evt.get('Hora') else ''
            eventos.append(evt)
        
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
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM Estudiantes WHERE id = %s", (usuario_id,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'success': False, 'message': f'El estudiante con ID #{usuario_id} no existe.'}), 400

            cursor.execute("SELECT id_E FROM Evento WHERE id_E = %s", (evento_id,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'success': False, 'message': f'El evento con ID #{evento_id} no existe.'}), 400

            cursor.execute("SELECT COALESCE(MAX(clave), 0) + 1 AS next_clave FROM Asignacion")
            next_clave = cursor.fetchone()['next_clave']

            cursor.execute(
                "INSERT INTO Asignacion (clave, estud_id, Event_id) VALUES (%s, %s, %s)",
                (next_clave, usuario_id, evento_id)
            )
            conn.commit()
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
        with conn.cursor() as cursor:
            query = "DELETE FROM Asignacion WHERE estud_id = %s AND Event_id = %s"
            cursor.execute(query, (estud_id, event_id))
            conn.commit()
            affected_rows = cursor.rowcount
        conn.close()
        
        if affected_rows > 0:
            return jsonify({'success': True, 'message': 'Te has dado de baja del evento correctamente.'})
        else:
            return jsonify({'success': False, 'message': 'No se encontró la inscripción para eliminar.'}), 404
    except Exception as e:
        print(">>> ERROR AL DAR DE BAJA:", str(e))
        return jsonify({'success': False, 'message': str(e)}), 400

# --- PANEL ADMIN ---
@app.route('/api/admin/estudiantes', methods=['GET'])
def obtener_estudiantes_admin():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
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
        
        filename = 'default_event.jpg'
        
        if 'imagen' in request.files:
            file = request.files['imagen']
            if file and file.filename.strip() != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                try:
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                except Exception as img_err:
                    print(">>> AVISO: No se pudo guardar imagen localmente en Serverless:", str(img_err))

        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT COALESCE(MAX(id_E), 0) + 1 AS next_id FROM Evento")
            next_id = cursor.fetchone()['next_id']

            query = """
                INSERT INTO Evento (id_E, Nombre_E, categoria, Fecha, Hora, Lugar, Cupo, `Desc`, Imagen)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (next_id, nombre, categoria, fecha, hora, lugar, cupo, desc, filename))
            conn.commit()
        conn.close()

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
        with conn.cursor() as cursor:
            if 'imagen' in request.files and request.files['imagen'].filename != '':
                file = request.files['imagen']
                if allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    try:
                        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                    except Exception as img_err:
                        print(">>> AVISO: No se pudo guardar imagen localmente:", str(img_err))
                    
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
        conn.close()
        return jsonify({'success': True, 'message': 'Evento actualizado exitosamente.'}), 200
    except Exception as e:
        print(">>> ERROR AL ACTUALIZAR EVENTO:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 400

@app.route('/api/admin/eliminar-evento/<int:id_E>', methods=['DELETE'])
def eliminar_evento(id_E):
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Asignacion WHERE Event_id = %s", (id_E,))
            cursor.execute("DELETE FROM Evento WHERE id_E = %s", (id_E,))
            conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': f'Evento #{id_E} eliminado correctamente.'}), 200
    except Exception as e:
        print(">>> ERROR AL ELIMINAR EVENTO:", str(e))
        return jsonify({'success': False, 'message': f'Error al eliminar: {str(e)}'}), 400

@app.route('/api/admin/crear-aviso', methods=['POST'])
def crear_aviso():
    try:
        data = request.get_json() or {}
        titulo = data.get('titulo')
        contenido = data.get('contenido')

        if not titulo or not contenido:
            return jsonify({'success': False, 'message': 'Título y contenido son obligatorios'}), 400

        conn = get_db_connection()
        with conn.cursor() as cursor:
            query = "INSERT INTO Avisos (titulo, contenido) VALUES (%s, %s)"
            cursor.execute(query, (titulo, contenido))
            conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': '¡Aviso publicado correctamente!'})
    except Exception as e:
        print(">>> ERROR AL PUBLICAR AVISO:", str(e))
        return jsonify({'success': False, 'message': f'Error en MySQL: {str(e)}'}), 500

@app.route('/api/avisos', methods=['GET'])
def obtener_avisos():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM Avisos ORDER BY id_aviso DESC")
            avisos_raw = cursor.fetchall()
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

if __name__ == '__main__':
    app.run(debug=True)