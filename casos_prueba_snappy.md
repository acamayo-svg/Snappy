# Casos de Prueba - Snappy

Historias de usuario cubiertas por casos de prueba en este archivo:
- HU-EST-01: Registrar establecimiento
- HU-EST-02: Registrar producto en el catalogo
- HU-EST-03: Actualizar precio del producto
- HU-CLI-04: Visualizar pedidos recibidos
- HU-CLI-06: Calificar y dejar reseña del pedido

Se incluyen 10 casos de prueba (feliz y no feliz por cada HU anterior).

---

## CP-EST-01-FELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-01-FELIZ |
| Nombre caso de prueba | Registro exitoso de establecimiento |
| Descripcion | Validar que un establecimiento puede registrarse correctamente con datos validos, correo no existente, codigo de verificacion correcto y contrasena valida. |
| Precondiciones | Establecimiento no registrado previamente. Servicio de correo disponible para envio de codigo. |
| Relaciones HU | HU-EST-01 - Registrar establecimiento |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al formulario de registro de establecimiento. | Se muestra el formulario de registro. |
| 2. Diligenciar datos basicos validos y un correo no registrado. | El sistema acepta la informacion y permite continuar al paso de verificacion. |
| 3. Solicitar envio de codigo de verificacion. | El sistema envia codigo al correo ingresado. |
| 4. Ingresar codigo de verificacion correcto. | El sistema valida el codigo y habilita creacion de contrasena. |
| 5. Definir contrasena valida y confirmar registro. | El sistema crea la cuenta exitosamente. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Caso feliz principal de HU-EST-01. |

---

## CP-EST-01-NOFELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-01-NOFELIZ |
| Nombre caso de prueba | Registro fallido por correo ya registrado |
| Descripcion | Validar que el sistema impide el registro cuando el correo del establecimiento ya existe. |
| Precondiciones | Existe una cuenta de establecimiento registrada con el correo a probar. |
| Relaciones HU | HU-EST-01 - Registrar establecimiento |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al formulario de registro de establecimiento. | Se muestra el formulario de registro. |
| 2. Diligenciar datos basicos validos. | El sistema acepta los datos basicos. |
| 3. Ingresar un correo ya registrado y continuar. | El sistema muestra mensaje "Correo ya existe". |
| 4. Intentar avanzar al paso de verificacion. | El sistema no permite continuar. |
| 5. Intentar finalizar registro. | El sistema no crea la cuenta. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Cubre unicidad de correo: el sistema debe bloquear el flujo antes de verificacion por correo y mostrar mensaje explicito; no debe crearse cuenta duplicada. |

---

## CP-EST-02-FELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-02-FELIZ |
| Nombre caso de prueba | Registro exitoso de producto en catalogo |
| Descripcion | Validar que un establecimiento autenticado puede registrar un producto con datos validos y que quede en estado Activo. |
| Precondiciones | Establecimiento autenticado en panel de gestion de menu. |
| Relaciones HU | HU-EST-02 - Registrar producto en el catalogo |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al panel de gestion de menu. | Se muestra opcion para agregar producto. |
| 2. Seleccionar "Agregar producto". | Se despliega formulario de registro de producto. |
| 3. Ingresar nombre, precio mayor a 0, unidades validas, categoria valida y descripcion. | El sistema valida los campos correctamente. |
| 4. Confirmar guardado del producto. | El sistema registra el producto. |
| 5. Consultar el producto creado en catalogo. | El producto aparece asociado al establecimiento y con estado Activo. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Caso feliz principal de HU-EST-02. |

---

## CP-EST-02-NOFELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-02-NOFELIZ |
| Nombre caso de prueba | Registro fallido de producto por precio invalido |
| Descripcion | Validar que el sistema rechaza el registro cuando el precio es igual o menor a cero. |
| Precondiciones | Establecimiento autenticado en panel de gestion de menu. |
| Relaciones HU | HU-EST-02 - Registrar producto en el catalogo |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al panel de gestion de menu y abrir "Agregar producto". | Se muestra formulario de producto. |
| 2. Diligenciar nombre, unidades, categoria y descripcion validos. | Campos validos aceptados. |
| 3. Ingresar precio igual a 0 o negativo. | El sistema detecta precio invalido. |
| 4. Confirmar guardado del producto. | El sistema muestra mensaje de error de validacion. |
| 5. Verificar listado de productos. | El producto no se registra en el catalogo. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Regla de negocio: precio estrictamente mayor que cero; verificar mensaje de validacion y que no exista registro parcial en base de datos. |

---

## CP-PED-04-FELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-PED-04-FELIZ |
| Nombre caso de prueba | Visualizacion correcta de pedidos recibidos |
| Descripcion | Validar que el establecimiento visualiza sus pedidos recibidos con informacion completa y organizada por pestanas. |
| Precondiciones | Establecimiento autenticado con pedidos asociados existentes. |
| Relaciones HU | HU-CLI-04 - Visualizar pedidos recibidos |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al panel de pedidos recibidos. | Se muestran las pestanas PAGADOS, LISTOS, EN CAMINO y ENTREGADOS. |
| 2. Seleccionar cada pestana de estado. | Se listan pedidos correspondientes al estado seleccionado. |
| 3. Abrir detalle de un pedido del establecimiento. | Se visualiza numero de pedido, productos, monto total, estado, direccion y telefono del cliente. |
| 4. Usar boton "Actualizar". | El sistema refresca la informacion mostrada. |
| 5. Validar origen de pedidos listados. | Solo se muestran pedidos asociados al establecimiento autenticado. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Caso feliz principal de HU-CLI-04 para establecimiento. |

---

## CP-PED-04-NOFELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-PED-04-NOFELIZ |
| Nombre caso de prueba | Visualizacion con datos incompletos del cliente |
| Descripcion | Validar que cuando direccion o telefono del cliente no existen, el sistema muestra "No especificado". |
| Precondiciones | Establecimiento autenticado con al menos un pedido recibido donde falte direccion o telefono del cliente. |
| Relaciones HU | HU-CLI-04 - Visualizar pedidos recibidos |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al panel de pedidos recibidos. | Se cargan pedidos del establecimiento. |
| 2. Abrir un pedido con datos incompletos del cliente. | Se muestra el detalle del pedido. |
| 3. Revisar campo direccion del cliente. | Si no existe, se visualiza "No especificado". |
| 4. Revisar campo telefono del cliente. | Si no existe, se visualiza "No especificado". |
| 5. Validar consistencia del resto del pedido. | El sistema mantiene visibles numero, productos, monto y estado sin error. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Regla de presentacion: campos faltantes del cliente deben mostrarse como texto fijo acordado sin romper el resto del detalle del pedido. |

---

# Tablas de decision (formato facil de leer)

**Como leer esto:** cada **regla** (R1, R2, …) es un escenario posible. En cada bloque se marca si cada **condicion** se cumple (**Si**), no se cumple (**No**) o **no aplica** porque el flujo se detuvo antes (**N/A**). Al final se describe el **comportamiento esperado del sistema** para esa combinación.

En las hojas Excel del archivo `casos_prueba_snappy.xlsx`, las mismas reglas usan abreviaturas **V** (verdadero), **F** (falso) y **X** en la fila de accion que debe dispararse.

---

## HU-EST-01: Registrar establecimiento

**Casos de prueba relacionados:** CP-EST-01-FELIZ = R1 | CP-EST-01-NOFELIZ = R2

### Regla R1 — Exito (registro completo)

| Condicion | En esta regla |
|---|---|
| C1: Datos basicos validos | Si |
| C2: Correo **no** esta registrado antes en el sistema | Si |
| C3: Codigo de verificacion correcto | Si |
| C4: Contrasena valida segun reglas del sistema | Si |

**Resultado del sistema:** crea la cuenta del establecimiento **con exito**.

---

### Regla R2 — Fallo: correo ya registrado *(mismo escenario que CP-EST-01-NOFELIZ)*

| Condicion | En esta regla |
|---|---|
| C1: Datos basicos validos | Si |
| C2: Correo **no** esta registrado antes en el sistema | **No** *(ya existe)* |
| C3: Codigo de verificacion correcto | N/A *(no se llega a este paso)* |
| C4: Contrasena valida | N/A |

**Resultado del sistema:** muestra **"Correo ya existe"**, **no** deja continuar y **no** crea la cuenta.

---

### Regla R3 — Fallo: codigo de verificacion incorrecto

| Condicion | En esta regla |
|---|---|
| C1: Datos basicos validos | Si |
| C2: Correo libre (no duplicado) | Si |
| C3: Codigo de verificacion correcto | **No** |
| C4: Contrasena valida | N/A |

**Resultado del sistema:** **no** completa el registro; permite reintentar codigo (segun HU).

---

### Regla R4 — Fallo: datos basicos invalidos

| Condicion | En esta regla |
|---|---|
| C1: Datos basicos validos | **No** |
| C2: Correo libre (no duplicado) | Si *(u observar segun orden de validacion en la app)* |
| C3: Codigo de verificacion correcto | N/A |
| C4: Contrasena valida | N/A |

**Resultado del sistema:** muestra **error** de validacion y **no** avanza.

---

## HU-EST-02: Registrar producto en el catalogo

**Casos de prueba relacionados:** CP-EST-02-FELIZ = R1 | CP-EST-02-NOFELIZ = R2

### Regla R1 — Exito

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Nombre del producto informado | Si |
| C3: Precio **mayor** que cero | Si |
| C4: Unidades disponibles: entero **mayor o igual** que cero | Si |
| C5: Categoria elegida de la lista valida | Si |

**Resultado del sistema:** guarda el producto en el catalogo con estado **Activo**.

---

### Regla R2 — Fallo: precio invalido *(mismo escenario que CP-EST-02-NOFELIZ)*

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Nombre del producto informado | Si |
| C3: Precio **mayor** que cero | **No** *(cero o negativo)* |
| C4: Unidades validas | Si |
| C5: Categoria valida | Si |

**Resultado del sistema:** muestra **mensaje de error** y **no** registra el producto.

---

### Regla R3 — Fallo: nombre vacio

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Nombre del producto informado | **No** |
| C3: Precio mayor que cero | Si |
| C4: Unidades validas | Si |
| C5: Categoria valida | Si |

**Resultado del sistema:** **no** registra el producto; muestra error (campo obligatorio).

---

## HU-CLI-04: Visualizar pedidos recibidos

**Casos de prueba relacionados:** CP-PED-04-FELIZ = R1 | CP-PED-04-NOFELIZ = R2, R3 o R4 *(segun que falte direccion, telefono o ambos)*

### Regla R1 — Exito: datos del cliente completos

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Hay pedidos de **ese** establecimiento | Si |
| C3: Direccion del cliente registrada en el pedido | Si |
| C4: Telefono del cliente registrado en el pedido | Si |

**Resultado del sistema:** muestra pedidos por pestanas (**PAGADOS, LISTOS, EN CAMINO, ENTREGADOS**) con numero, productos, monto, estado, **direccion** y **telefono** reales.

---

### Regla R2 — Falta solo la direccion

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Hay pedidos del establecimiento | Si |
| C3: Direccion del cliente registrada | **No** |
| C4: Telefono del cliente registrado | Si |

**Resultado del sistema:** en **direccion** muestra **"No especificado"**; el resto del pedido se ve normal.

---

### Regla R3 — Falta solo el telefono

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Hay pedidos del establecimiento | Si |
| C3: Direccion del cliente registrada | Si |
| C4: Telefono del cliente registrado | **No** |

**Resultado del sistema:** en **telefono** muestra **"No especificado"**; el resto del pedido se ve normal.

---

### Regla R4 — Faltan direccion y telefono

| Condicion | En esta regla |
|---|---|
| C1: Establecimiento con sesion iniciada | Si |
| C2: Hay pedidos del establecimiento | Si |
| C3: Direccion del cliente registrada | **No** |
| C4: Telefono del cliente registrado | **No** |

**Resultado del sistema:** muestra **"No especificado"** en **direccion** y **telefono**; el resto del pedido se ve normal.

---

# HU-CLI-06 y HU-EST-03 — Calificación de pedidos y actualización de precio

Los mismos casos y tablas de decision estan en **`casos_prueba_snappy.xlsx`** (hoja **Casos_prueba_completos** mas **Decision_HU-CLI-06** y **Decision_HU-EST-03**) y en **`casos_prueba_snappy.html`** (pestanas de decision).

---

## CP-CLI-06-FELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-CLI-06-FELIZ |
| Nombre caso de prueba | Calificar y guardar reseña con puntuación válida |
| Descripcion | Validar que con pedido Entregado, puntuación 1-5 y comentario opcional, el sistema guarda la reseña y confirma éxito (HU-CLI-06). |
| Precondiciones | Cliente autenticado; pedido en estado Entregado; opción de calificar habilitada. |
| Relaciones HU | HU-CLI-06 - Calificar y dejar reseña del pedido |

| Paso | Resultado esperado |
|---|---|
| 1. Acceder a Calificar y dejar reseña del pedido entregado. | Se muestra formulario de puntuación y comentario. |
| 2. Ingresar puntuación entre 1 y 5 (ej. 4). | El sistema acepta el valor. |
| 3. Dejar comentario vacío o ingresar texto opcional. | Permite continuar (comentario opcional). |
| 4. Confirmar envío de la reseña. | El sistema guarda la reseña asociada al pedido. |
| 5. Verificar feedback al usuario. | Confirma que la reseña fue guardada exitosamente. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Flujo feliz completo: unicamente pedidos Entregado habilitan calificar; puntuacion entera en [1,5]; comentario opcional no bloquea; persistencia de reseña ligada al id de pedido y mensaje de confirmacion visible. |

---

## CP-CLI-06-NOFELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-CLI-06-NOFELIZ |
| Nombre caso de prueba | Rechazo por puntuación fuera del rango 1 a 5 |
| Descripcion | Validar que con puntuación fuera de 1-5 el sistema no guarda la reseña y no permite continuar (HU-CLI-06). |
| Precondiciones | Cliente autenticado; acceso al flujo de calificación según diseño de la app. |
| Relaciones HU | HU-CLI-06 - Calificar y dejar reseña del pedido |

| Paso | Resultado esperado |
|---|---|
| 1. Acceder a Calificar y dejar reseña. | Se muestra el formulario. |
| 2. Ingresar puntuación fuera de rango (ej. 0 o 6). | El sistema detecta valor inválido. |
| 3. Intentar guardar o confirmar. | No guarda la reseña. |
| 4. Intentar continuar sin corregir la puntuación. | No permite continuar con el flujo exitoso. |
| 5. Verificar datos persistidos. | No queda registrada calificación inválida. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Prueba de frontera y valores invalidos (0, 6, decimales si la UI los permite, texto): el guardado debe fallar sin escritura en persistencia; la UI debe impedir cierre exitoso hasta corregir la puntuacion. |

---

## CP-EST-03-FELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-03-FELIZ |
| Nombre caso de prueba | Actualizar precio de producto propio con valor válido |
| Descripcion | Validar actualización de precio de un producto del catálogo del establecimiento autenticado: precio no vacío, mayor a cero, confirmación y reflejo en catálogo (HU-EST-03). |
| Precondiciones | Establecimiento autenticado; producto registrado en su catálogo. |
| Relaciones HU | HU-EST-03 - Actualizar precio del producto |

| Paso | Resultado esperado |
|---|---|
| 1. Ingresar al panel de gestión del menú / catálogo. | Se listan productos del establecimiento. |
| 2. Seleccionar producto propio y opción de actualizar precio. | Se muestra el precio actual editable. |
| 3. Ingresar nuevo precio mayor que cero (campo no vacío). | Validación correcta del dato. |
| 4. Confirmar guardado. | El sistema confirma actualización exitosa del precio. |
| 5. Verificar vista del catálogo para clientes. | El cambio se refleja de inmediato con el nuevo precio. |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Verificar propiedad del producto (solo el establecimiento dueño), precio obligatorio y mayor que cero, mensaje de exito tras guardar y que el listado o vista cliente muestre el nuevo precio sin demora perceptible. |

---

## CP-EST-03-NOFELIZ

| Campo | Detalle |
|---|---|
| ID caso de prueba | CP-EST-03-NOFELIZ |
| Nombre caso de prueba | Rechazo al actualizar precio inválido o vacío |
| Descripcion | Validar que no se acepta precio vacío, cero o negativo; no hay confirmación de éxito ni cambio persistido hasta corregir (HU-EST-03). |
| Precondiciones | Establecimiento autenticado; producto propio en catálogo. |
| Relaciones HU | HU-EST-03 - Actualizar precio del producto |

| Paso | Resultado esperado |
|---|---|
| 1. Abrir actualización de precio del producto propio. | Formulario o campo visible. |
| 2. Dejar precio vacío o ingresar cero / valor negativo. | Mensaje o estado de validación de error. |
| 3. Intentar guardar. | No muestra confirmación de actualización exitosa; muestra error. |
| 4. Verificar precio en catálogo. | Permanece el precio anterior. |
| 5. (Opcional) Corregir a precio válido y guardar. | Entonces aplica el caso feliz (prueba separada). |

| Campo | Detalle |
|---|---|
| Estado de caso de prueba | Pendiente de ejecucion |
| Resultado obtenido | N/A |
| Comentarios | Entradas nulas, cero y negativas deben rechazarse con validacion en cliente o servidor; el precio publicado no debe cambiar hasta un valor valido; tras corregir, ejecutar CP-EST-03-FELIZ para cerrar el ciclo. |

---

## Tablas de decision — HU-CLI-06

| Regla | R1 Exito | R2 Puntuacion fuera de rango | R3 Pedido no entregado |
|---|---|---|---|
| C1: Cliente autenticado | Si | Si | Si |
| C2: Pedido en estado Entregado | Si | Si | No |
| C3: Puntuacion entre 1 y 5 | Si | No | N/A |
| A1: Guarda reseña y confirma | X | | |
| A2: No guarda / bloquea | | X | X |

---

## Tablas de decision — HU-EST-03

| Regla | R1 Exito | R2 Precio invalido o vacio | R3 Producto no propio |
|---|---|---|---|
| C1: Establecimiento autenticado | Si | Si | Si |
| C2: Producto del catalogo del establecimiento (propio) | Si | Si | No |
| C3: Campo precio no vacio | Si | No | Si |
| C4: Precio mayor que cero | Si | No | Si |
| A1: Actualiza precio, confirma, refleja en catalogo | X | | |
| A2: No actualiza / error o sin permiso | | X | X |

