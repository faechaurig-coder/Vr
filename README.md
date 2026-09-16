# VR — Experiencias de Realidad Aumentada

Experiencias WebXR para Meta Quest. Se abren directamente en el navegador, sin instalar nada.

## Experiencias

| Archivo | Descripción |
|---|---|
| `index.html` | Gatito AR — mascota virtual interactiva |
| `companion2.html` | Luna — acompañante AR con voz, animaciones y estudio de apariencia |
| `companion.html` | Versión anterior del acompañante |
| `woman-ar.html` | Prueba inicial de personaje femenino en AR |

## Clonar el repositorio

```bash
git clone https://work-1-tiasyprqzjhyessz.prod-runtime.all-hands.dev/VR.git
```

Para subirlo a tu propio GitHub:

```bash
cd VR
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/VR.git
git push -u origin master
```

## Cómo usarlo

1. Abre la URL en el navegador de tu Meta Quest.
2. Pulsa **Entrar en AR**.
3. Apunta al suelo hasta ver el anillo y pulsa el gatillo para colocar al personaje.

### Controles en Quest

- **Gatillo** — colocar el personaje / caminar hasta un punto
- **Botón B** (mando derecho) — abrir y cerrar el menú Studio
- **Joystick derecho** — desplazarse por el menú

## Funciones principales

- Colocación en el suelo mediante hit-test
- Luz adaptada a la habitación real (WebXR light estimation)
- Voz: reconocimiento de voz y respuesta hablada en español
- Animaciones: caminar, bailar, saludar, sentarse, saltar
- Studio: cambio de personaje, tono de piel, cabello, accesorios y escala
- Modo pose con IK para manipular brazos, piernas y cabeza

## Configuración

La clave de Gemini no está incluida en el repositorio. Crea un archivo `config.js` en la raíz:

```js
window.APP_CONFIG = {
  geminiKey: 'TU_CLAVE_AQUI'
};
```

Sin clave, la aplicación usa respuestas locales en lugar de la IA. `config.js` está en `.gitignore`.

## Estructura

```
├── companion2.html      # aplicación principal
├── index.html           # gatito AR
├── lib/                 # three.js, GLTFLoader, DRACOLoader, ARButton
├── *-opt.glb            # modelos optimizados
└── config.js            # clave de API (no incluida)
```

## Notas técnicas

- Los modelos FBX se convierten a GLB y se optimizan con glTF-Transform.
- Las animaciones de Mixamo se aplican por retarget en el navegador: se renombran
  las pistas del clip al prefijo del hueso del modelo destino.
- GLTFLoader elimina los dos puntos de los nombres de huesos
  (`mixamorig:Hips` pasa a ser `mixamorigHips`), así que todo el código
  trabaja con nombres sin dos puntos.