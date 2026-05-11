# Sistema de Gestión de Pañol — Colegio Técnico

Este es el sistema completo para la gestión de egresos, ingresos y control de inventario del pañol, construido con **Next.js**, **Tailwind CSS** y **Google Sheets API**.

## Arquitectura de la Base de Datos (Google Sheets)

El sistema utiliza un documento de Google Sheets como base de datos. Debes crear un nuevo archivo de Google Sheets y crear exactamente estas 5 hojas (pestañas) con los siguientes encabezados en la **Fila 1** de cada hoja:

1. **MOVIMIENTOS**
   `ID`, `ID_PLANILLA`, `FECHA`, `HORA_EGRESO`, `ALUMNO_RESPONSABLE`, `DNI_ALUMNO`, `CURSO`, `MATERIA`, `PROFESOR`, `ITEMS_EGRESADOS`, `ESTADO`, `PAÑOLERO`, `ITEMS_INGRESADOS`, `HORA_INGRESO`, `DIFERENCIA`, `OBSERVACIONES`
2. **INVENTARIO**
   `ID`, `NOMBRE`, `CATEGORIA`, `STOCK_TOTAL`, `STOCK_DISPONIBLE`, `STOCK_MINIMO`, `ACTIVO`
3. **USUARIOS**
   `ID`, `NOMBRE`, `APELLIDO`, `EMAIL`, `PASSWORD`, `ROL`, `ACTIVO`
4. **MATERIAS**
   `ID`, `NOMBRE`, `CURSO`, `ACTIVO`
5. **PROFESORES**
   `ID`, `NOMBRE`, `APELLIDO`, `MATERIA_ID`, `ACTIVO`

> **Nota:** El sistema detectará automáticamente si no hay usuarios en la tabla `USUARIOS` e insertará un Administrador por defecto cuando intentes iniciar sesión por primera vez.

## Guía de Despliegue en la Web (Vercel)

Vercel es la plataforma ideal y gratuita para alojar proyectos de Next.js. Sigue estos pasos para poner tu sistema en línea:

### Paso 1: Configurar Google Cloud (Credenciales)
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un nuevo proyecto (Ej. "Sistema Pañol").
3. En el menú, ve a **API y Servicios** > **Biblioteca** y busca **Google Sheets API**. Haz clic en "Habilitar".
4. Ve a **Credenciales** > **Crear Credenciales** > **Cuenta de Servicio**.
5. Ponle un nombre y créala.
6. Haz clic en la cuenta de servicio creada, ve a la pestaña **Claves** > **Agregar Clave** > **Crear clave nueva** > Formato **JSON**.
7. Esto descargará un archivo `.json` a tu computadora. Ábrelo; necesitarás el `client_email` y el `private_key` más adelante.
8. **Muy importante**: Ve a tu Google Sheet, haz clic en "Compartir" y comparte el documento (como Editor) al correo electrónico (`client_email`) de tu cuenta de servicio.

### Paso 2: Subir el código a GitHub
1. Crea una cuenta en [GitHub](https://github.com/) si no tienes una.
2. Descarga GitHub Desktop o usa la consola de Git para subir esta carpeta completa a un nuevo repositorio privado.

### Paso 3: Desplegar en Vercel
1. Crea una cuenta en [Vercel](https://vercel.com/) y conéctala con tu GitHub.
2. Haz clic en **Add New Project** y selecciona tu repositorio del Sistema de Pañol.
3. Antes de darle a "Deploy", abre la sección **Environment Variables**. Debes agregar las siguientes variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: El email (`client_email`) que sacaste del JSON.
   - `GOOGLE_PRIVATE_KEY`: La clave privada entera (`private_key`), asegúrate de incluir los textos `-----BEGIN RSA PRIVATE KEY-----` y los saltos de línea.
   - `GOOGLE_SPREADSHEET_ID`: El ID de tu archivo de Google Sheets. Lo encuentras en la URL de tu documento de Google, entre `/d/` y `/edit`.
   - `JWT_SECRET`: Una contraseña secreta larga (ej. `misupersecretoclave2026`). Se usa para la seguridad de los logins.
   - `TZ`: `America/Argentina/Buenos_Aires` (Para fijar la zona horaria).
4. Haz clic en **Deploy**.

¡Y listo! Vercel te dará una URL (por ejemplo: `sistema-panol.vercel.app`).

### Paso 4: Iniciar Sesión por primera vez
- Ve a tu nueva página web.
- Ingresa a la pantalla de Login e intenta entrar con cualquier correo y contraseña.
- Si la pestaña de USUARIOS está vacía, el sistema creará automáticamente una cuenta administradora:
  - **Email**: `admin@panol.com`
  - **Contraseña**: `admin123`
- Ingresa con esas credenciales. Una vez dentro, ve a "Usuarios" en el menú, crea tu propia cuenta de Administrador y elimina la cuenta por defecto.
