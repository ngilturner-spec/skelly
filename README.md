# Skelly

App para aprender los huesos en 3D con repetición espaciada (FSRS) y pistas de letras que van desapareciendo.

- Instalable en el móvil (PWA) y funciona sin conexión.
- Esqueleto completo: cabeza, columna y tórax, miembro superior y miembro inferior.
- Vértebras y costillas se preguntan por tipo (cervical, costilla verdadera derecha…).
- Sección de partes de cada hueso (en construcción, `src/data/partes.ts`).
- Modos: hueso aislado, en conjunto y localizar.

## Desarrollo

```
npm install
npm run dev
```

Regenerar los modelos (necesita los datos de BodyParts3D en `../raw/bp3d`):

```
node scripts/build-models.mjs
```

## Créditos y licencias

- Modelos 3D: **BodyParts3D**, © The Database Center for Life Science, licencia
  [CC BY-SA 2.1 JP](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).
  Los modelos de `public/models` son una versión suavizada y comprimida, y se comparten con la misma licencia.
- Cóccix: **NIH 3D**, entrada [3DPX-016830](https://3d.nih.gov/entries/3DPX-016830), licencia
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
