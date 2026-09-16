# Vr — Experiencias de Realidad Aumentada

Experiencias WebXR para Meta Quest. Se abren en el navegador, sin instalar nada.

Repo: https://github.com/faechaurig-coder/Vr

## Experiencias

| Archivo | Descripción |
|---|---|
| `index.html` | Gatito AR con cerebro motor de mosca (MOSCA) |
| `companion2.html` | Luna y avatares Mixamo — misma puerta sensorial `senseAt` |
| `companion.html` | Versión anterior del acompañante |
| `woman-ar.html` | Prueba inicial de personaje femenino en AR |

## Cerebro de mosca

No es un conectoma. El movimiento lo decide `MotorIntent` (`lib/fly-brain.js`), copiado de MOSCA:

- **Única puerta sensorial:** `senseAt` (antenas L/R, palpos residuales 12% no espaciales).
- **Tropotaxis:** más fermentación en una antena → gira hacia ese lado.
- **Geosmina (OR56a):** evita. No es “olor feo” genérico.
- **Looming (LC4→GF):** acercarte de golpe dispara escape. Johnston no huele.
- **Antena L oculta:** el lado izquierdo deja de ser espacial; queda el palpo.

En el gato y en Luna: primer gatillo coloca; los siguientes dejan olor en el suelo. **Ven** en Luna es una excepción social (línea recta) y luego vuelve el cerebro.

## Clonar

```bash
git clone https://github.com/faechaurig-coder/Vr.git
```

## Cómo usarlo

1. Abre la URL HTTPS en el navegador de tu Meta Quest (GitHub Pages o un host estático).
2. Pulsa **Entrar en AR**.
3. Apunta al suelo hasta ver el anillo y pulsa el gatillo para colocar al personaje.
4. Toca otro punto para dejar fermentación o geosmina.

### Controles en Quest

- **Gatillo** — colocar / dejar olor
- **Botón B** (mando derecho) — abrir y cerrar el menú Studio (Luna)
- **Joystick derecho** — desplazarse por el menú

## Funciones principales

- Colocación en el suelo mediante hit-test
- Luz adaptada a la habitación real (WebXR light estimation)
- Voz: reconocimiento de voz y respuesta hablada en español
- Animaciones: caminar, bailar, saludar, sentarse, saltar
- Studio: cambio de personaje, tono de piel, cabello, accesorios y escala
- Modo pose con IK para manipular brazos, piernas y cabeza
- Mundo químico local (fermentación / geosmina / CO₂) sobre el suelo AR

## Configuración

La clave de Gemini no está incluida. Crea `config.js` en la raíz:

```js
window.APP_CONFIG = {
  geminiKey: 'TU_CLAVE_AQUI'
};
```

Sin clave, Luna usa respuestas locales. `config.js` está en `.gitignore`.

## Estructura

```
├── companion2.html      # Luna + avatares
├── index.html           # gatito AR
├── lib/fly-brain.js     # MotorIntent MOSCA
├── lib/                 # three.js, GLTFLoader, DRACOLoader, ARButton
├── *-opt.glb            # modelos optimizados
└── config.js            # clave de API (no incluida)
```

## Notas técnicas

- Los modelos FBX se convierten a GLB y se optimizan con glTF-Transform.
- Las animaciones de Mixamo se aplican por retarget en el navegador.
- GLTFLoader elimina los dos puntos de los nombres de huesos
  (`mixamorig:Hips` pasa a ser `mixamorigHips`).
