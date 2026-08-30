# Actividad: paginación, fechas y navegación segura

## Cambios realizados

- `userService.getActivityHistory` acepta opciones de usuario, rol, página, límite y rango de fechas; devuelve `{ data, hasMore }`.
- Las consultas a Supabase filtran por fecha, se ordenan por fecha y usan `range(...)` para cargar lotes de diez registros.
- **Mi Actividad** integra el selector personalizado de fechas, reinicia la paginación al cambiar el filtro o rol y permite limpiar el rango activo.
- La lista implementa carga infinita, indicador al pie y deduplicación de resultados.
- El retroceso nativo usa `useSafeBackHandler`, con Perfil como destino de respaldo. Las pestañas preservan el historial con `backBehavior="history"`.
- El selector sincroniza su borrador de fechas al abrirse, por lo que muestra el filtro aplicado.

## Verificación

La comprobación de tipos terminó correctamente con:

```bash
npx.cmd tsc --noEmit
```

En PowerShell se empleó `npx.cmd` porque la política local bloquea `npx.ps1`; es equivalente a `npx tsc --noEmit`.

## Pruebas manuales sugeridas

1. Selecciona y limpia un rango en **Perfil → Mi Actividad** y verifica que se reinicie la lista.
2. Con más de diez actividades, llega al final para comprobar la carga del siguiente lote.
3. Prueba el botón físico o gesto de retroceso desde Actividad; debe regresar sin cerrar la app.
