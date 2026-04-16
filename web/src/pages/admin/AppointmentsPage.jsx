import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ==============================================================================
// PALETA
// ==============================================================================
const C = { navy:"#1a2e4a", blue:"#4a9fd4", teal:"#1D9E75", amber:"#BA7517", red:"#E24B4A", purple:"#7c3aed" };
const TCOL = { success:C.teal, error:C.red, warning:C.amber, info:C.blue };

// ==============================================================================
// CAPA DE PERSISTENCIA
// ==============================================================================
const DB = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        const r = await window.storage.get("aq:" + key);
        return r ? JSON.parse(r.value) : null;
      }
      const v = localStorage.getItem("aq:" + key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const v = JSON.stringify(value);
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.set("aq:" + key, v);
      } else {
        localStorage.setItem("aq:" + key, v);
      }
      return true;
    } catch { return false; }
  },
  async del(key) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        await window.storage.delete("aq:" + key);
      } else {
        localStorage.removeItem("aq:" + key);
      }
    } catch {}
  },
  async setMany(entries) {
    return Promise.all(entries.map(([k, v]) => DB.set(k, v)));
  }
};

const DATA_VERSION = "v20260415-6"; // Cambiar esto fuerza reset de todos los datos

function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!window.storage) { setLoaded(true); return; }
    const timeout = setTimeout(() => setLoaded(true), 1500);
    DB.get(key).then(saved => {
      clearTimeout(timeout);
      if (saved !== null) {
        try { setValue(saved); } catch(e) {}
      }
      setLoaded(true);
    }).catch(() => { clearTimeout(timeout); setLoaded(true); });
    return () => clearTimeout(timeout);
  }, [key]);

  const setAndPersist = useCallback((valOrFn) => {
    setValue(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { DB.set(key, next); }, 400);
      return next;
    });
  }, [key]);

  return [value, setAndPersist, loaded];
}

// Hook que limpia TODO el storage si la versión cambió — corre UNA sola vez
function useVersionCheck(onReset) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!window.storage) { onReset(); return; }
    DB.get("__data_version__").then(ver => {
      if (ver !== DATA_VERSION) {
        // Versión cambió: guardar defaults directamente en storage
        Promise.all([
          DB.set("__data_version__", DATA_VERSION),
          DB.set("proyectos",   PROYECTOS_DEFAULT),
          DB.set("leads",       LEADS_DEFAULT),
          DB.set("cotizaciones",COTS_DEFAULT),
          DB.set("usuarios",    USUARIOS_INIT),
          DB.set("tarifas",     TARIFAS_OFICIALES),
          DB.set("sysConfig",   {margenObj:30,tc:3.60,moneda:"USD"}),
        ]).then(() => onReset());
      } else {
        onReset();
      }
    }).catch(() => onReset());
  }, []);
}

// ==============================================================================
// USUARIOS Y ROLES
// ==============================================================================
const USUARIOS_INIT = [
  { id:1, nombre:"Wilmer Moreno V.",     email:"wilmer@nexova.pe", password:"aquarius2026", rol:"Admin",          activo:true,  avatar:"WM", color:C.navy   },
  { id:2, nombre:"Pedro Vargas",     email:"pvargas@aquariusconsulting.com.pe",    password:"pedro123",     rol:"Comercial",      activo:true,  avatar:"PV", color:C.teal   },
  { id:3, nombre:"Carlos Quispe",    email:"cquispe@aquariusconsulting.com.pe",    password:"carlos123",    rol:"Jefe Proyecto",  activo:true,  avatar:"CQ", color:C.blue   },
  { id:4, nombre:"María López",      email:"mlopez@aquariusconsulting.com.pe",     password:"maria123",     rol:"Consultor",      activo:true,  avatar:"ML", color:C.purple },
  { id:5, nombre:"Ana Torres",       email:"atorres@aquariusconsulting.com.pe",    password:"ana123",       rol:"Consultor",      activo:true,  avatar:"AT", color:C.amber  },
  { id:6, nombre:"Jorge Campos",     email:"jcampos@aquariusconsulting.com.pe",    password:"jorge123",     rol:"Operaciones",    activo:false, avatar:"JC", color:"#6b7280" },
  { id:7, nombre:"Gerencia",         email:"gerencia@aquariusconsulting.com.pe",    password:"gerencia2026", rol:"Gerencia",       activo:true,  avatar:"GR", color:C.red    },
  { id:8, nombre:"Recursos Humanos", email:"rrhh@aquariusconsulting.com.pe",        password:"rrhh123",      rol:"RRHH",           activo:true,  avatar:"RH", color:C.teal   },
  // Comerciales de prueba
  { id:9,  nombre:"Lucía Romero",    email:"lromero@aquariusconsulting.com.pe",   password:"lucia123",   rol:"Comercial", activo:true,  avatar:"LR", color:"#7c3aed" },
  { id:10, nombre:"Rodrigo Paz",     email:"rpaz@aquariusconsulting.com.pe",      password:"rodrigo123", rol:"Comercial", activo:true,  avatar:"RP", color:"#0891b2" },
  { id:11, nombre:"Sofía Herrera",   email:"sherrera@aquariusconsulting.com.pe",  password:"sofia123",   rol:"Comercial", activo:true,  avatar:"SH", color:"#be185d" },
];

const ACCESO_ROL = {
  Admin:           ["dashboard","crm","importleads","rentabilidad","recursos","ejecucion","presupuesto","reportes","rrhh","calidad","inventario","facturacion","propuestas","notificaciones","integraciones","config","manual"],
  Comercial:       ["dashboard","crm","importleads","rentabilidad","manual"],
  Gerencia:        ["dashboard","crm","ejecucion","presupuesto","reportes","facturacion","propuestas","manual"],
  "Jefe Proyecto": ["dashboard","ejecucion","presupuesto","recursos","calidad","inventario","manual"],
  Consultor:       ["ejecucion","calidad","inventario","manual"],
  Operaciones:     ["recursos","ejecucion","calidad","inventario","manual"],
  RRHH:            ["recursos","rrhh","manual"],
};

const INICIO_ROL = {
  Admin:"dashboard", Comercial:"crm", Gerencia:"dashboard",
  "Jefe Proyecto":"ejecucion", Consultor:"ejecucion",
  Operaciones:"recursos", RRHH:"rrhh",
};

const ROLES_DISPONIBLES = ["Admin","Comercial","Jefe Proyecto","Consultor","Operaciones","Gerencia","RRHH"];

// ==============================================================================
// DATOS POR DEFECTO
// ==============================================================================
// -- Catálogo oficial de servicios NEXOVA --
const SERVICIOS_AQUARIUS = [
  // INVENTARIO Y CONTROL DEL ACTIVO FIJO
  {id:"S01", grupo:"Inventario de Activo Fijo",
   nombre:"Inventario y Conciliación Contable del Activo Fijo",
   desc:"Identificación física, etiquetado y conciliación con registros contables. Incluye opción de componetización bajo NIIF/IFRS.",
   opcional:"Componetización bajo NIIF/IFRS", tipo:"operativo+contable",
   cargos:["Jefe de Proyecto","Consultor Funcional","Consultor Contable","Supervisor de Inventario","Asistente Contable","Asistentes de Inventario"]},
  {id:"S02", grupo:"Inventario de Activo Fijo",
   nombre:"Inventario y Conciliación Operativa del Activo Fijo",
   desc:"Identificación y verificación física de activos sin conciliación contable completa. Enfocado en control operativo.",
   opcional:null, tipo:"operativo",
   cargos:["Jefe de Proyecto","Consultor Funcional","Supervisor de Inventario","Asistentes de Inventario"]},
  {id:"S03", grupo:"Inventario de Activo Fijo",
   nombre:"Inventario Operativo del Activo Fijo",
   desc:"Toma física de inventario con identificación, etiquetado y reporte de ubicaciones y estado de activos.",
   opcional:null, tipo:"operativo",
   cargos:["Supervisor de Inventario","Asistentes de Inventario"]},
  {id:"S04", grupo:"Servicios Contables Especializados",
   nombre:"Normalización y Conciliación Contable del Activo Fijo",
   desc:"Ejecutado por consultores contables (contadores). Regularización y conciliación de registros contables de activos fijos.",
   opcional:null, tipo:"contable",
   cargos:["Consultor Contable","Asistente Contable"]},
  {id:"S05", grupo:"Servicios Contables Especializados",
   nombre:"Normalización de la Base Contable por Rango de Años",
   desc:"Regularización histórica de registros contables de activos fijos por períodos específicos.",
   opcional:null, tipo:"contable",
   cargos:["Consultor Contable","Asistente Contable"]},
  {id:"S06", grupo:"Inventario de Activo Fijo",
   nombre:"Inventario y Valuación Comercial del Activo Fijo",
   desc:"Inventario físico combinado con valuación comercial de activos bajo NIIF 13 y normas de valuación IVSC.",
   opcional:null, tipo:"operativo+valuacion",
   cargos:["Jefe de Proyecto","Perito Tasador","Consultor Funcional","Supervisor de Inventario","Asistentes de Inventario"]},
  // VALUACIÓN COMERCIAL
  {id:"S07", grupo:"Valuación Comercial",
   nombre:"Valuación Comercial del Activo Fijo",
   desc:"Determinación del valor razonable de activos fijos bajo NIIF 13, RNT e IVSC, con perito tasador certificado.",
   opcional:null, tipo:"valuacion",
   cargos:["Perito Tasador","Supervisor de Perito","Consultor Funcional"]},
  {id:"S08", grupo:"Valuación Comercial",
   nombre:"Estudio de Mermas",
   desc:"Determinación técnica de mermas en procesos productivos para fines tributarios y contables.",
   opcional:null, tipo:"valuacion",
   cargos:["Perito Tasador","Consultor Funcional"]},
  {id:"S09", grupo:"Valuación Comercial",
   nombre:"Servicio de Topografía",
   desc:"Levantamiento topográfico de terrenos, edificaciones y áreas operativas.",
   opcional:"Con Drone", tipo:"valuacion",
   cargos:["Topógrafo","Asistente de Topografía"]},
  // VENTA DE SOFTWARE
  {id:"S10", grupo:"Software",
   nombre:"Venta de Software SITIA",
   desc:"Sistema de Inventario y Trazabilidad de Activos. Licenciamiento e implementación.",
   opcional:null, tipo:"software",
   cargos:["Consultor de Sistemas","Jefe de TI"]},
  // SERVICIOS LOGÍSTICOS
  {id:"S11", grupo:"Logística",
   nombre:"Servicios Logísticos de Inventario",
   desc:"Apoyo logístico para operaciones de inventario: transporte, almacenaje, etiquetado masivo.",
   opcional:null, tipo:"logistica",
   cargos:["Coordinador Logístico"]},
  // OUTSOURCING
  {id:"S12", grupo:"Outsourcing",
   nombre:"Outsourcing en Gestión de Activos Fijos",
   desc:"Administración y control permanente del área de activos fijos del cliente.",
   opcional:null, tipo:"outsourcing",
   cargos:["Jefe de Proyecto","Consultor Funcional","Asistente Contable"]},
];

const PROYECTOS_DEFAULT = [
  {
    id:"000004266", cliente:"Cía. Minera SIMSA", ruc:"20100177421",
    proyecto:"Inventario y Conciliación del Activo Fijo",
    division:"Consultoría Activo Fijo", valor:26500, avance:35, margen:24.1,
    faseActual:3, fase:"Fase 3 — Inventario físico", estado:"ejecucion",
    cobrado:6625, pendiente:19875, horasCot:2772, horasReal:980, activosPresupuestados:3500, costoUnitAdicional:2.00,
    personal:[
      {cargo:"Jefe Soporte/Operativo", cot:48,  real:48},
      {cargo:"Jefe de Soporte",        cot:8,   real:8},
      {cargo:"Coord. Seguridad",       cot:24,  real:18},
      {cargo:"Consultor Funcional",    cot:524, real:310},
      {cargo:"Supervisor Inventario",  cot:176, real:95},
      {cargo:"Asistente Contable",     cot:160, real:80},
      {cargo:"Asistente Inventario x12",cot:1800,real:720},
    ],
    inicio:"2026-03-23", fin:"2026-06-23", plazo:9, jefe:"Carlos Quispe",
    documentos:[
      {id:"D001",nom:"Acta de Inicio firmada",tipo:"acta",fecha:"2026-03-23",subido:true,url:"#",size:"245 KB"},
      {id:"D002",nom:"Plan de inventario físico",tipo:"plan",fecha:"2026-03-30",subido:true,url:"#",size:"1.2 MB"},
      {id:"D003",nom:"Cronograma detallado",tipo:"cronograma",fecha:"2026-03-28",subido:true,url:"#",size:"380 KB"},
      {id:"D004",nom:"Informe de avance Sem. 1",tipo:"informe",fecha:"2026-03-30",subido:true,url:"#",size:"890 KB"},
      {id:"D005",nom:"Informe de avance Sem. 2",tipo:"informe",fecha:"2026-04-06",subido:false,url:null,size:null},
    ],
    cobros:[
      {n:1,monto:6625,fecha:"2026-03-30",estado:"cobrado"},
      {n:2,monto:6625,fecha:"2026-04-30",estado:"pendiente"},
      {n:3,monto:6625,fecha:"2026-05-31",estado:"pendiente"},
      {n:4,monto:6625,fecha:"2026-06-23",estado:"pendiente"},
    ],
    fases:[
      {id:1,nombre:"Acta de inicio y movilización",semIni:1,semFin:1,estado:"completada",avance:100,
       ents:[{id:0,nom:"Acta de inicio firmada",est:"entregado",fecha:"2026-03-23",arch:true},{id:1,nom:"Plan de movilización aprobado",est:"entregado",fecha:"2026-03-23",arch:true}]},
      {id:2,nombre:"Planeamiento y organización del inventario",semIni:1,semFin:1,estado:"completada",avance:100,
       ents:[{id:2,nom:"Cronograma detallado",est:"entregado",fecha:"2026-03-28",arch:true},{id:3,nom:"Catálogo AF",est:"entregado",fecha:"2026-03-28",arch:true},{id:4,nom:"Maestro de ubicaciones",est:"entregado",fecha:"2026-03-29",arch:true},{id:41,nom:"Maestro de centros de costo",est:"entregado",fecha:"2026-03-29",arch:true},{id:42,nom:"Maestro de responsables",est:"entregado",fecha:"2026-03-29",arch:true},{id:5,nom:"Plan de inventario físico",est:"entregado",fecha:"2026-03-30",arch:true}]},
      {id:3,nombre:"Inventario físico + Control de calidad",semIni:2,semFin:3,estado:"en_curso",avance:60,
       ents:[{id:6,nom:"Reporte por tipo de activo",est:"en_curso",fecha:"2026-04-12",arch:false},{id:7,nom:"Reporte por centro de costo",est:"pendiente",fecha:"2026-04-15",arch:false},{id:8,nom:"Reporte por responsable",est:"pendiente",fecha:"2026-04-15",arch:false},{id:9,nom:"Control de calidad",est:"pendiente",fecha:"2026-04-18",arch:false}]},
      {id:4,nombre:"Planeamiento y organización contable",semIni:1,semFin:2,estado:"en_curso",avance:40,
       ents:[{id:10,nom:"Cronograma contable",est:"entregado",fecha:"2026-03-30",arch:true},{id:11,nom:"Diagnóstico procedimientos AF",est:"en_curso",fecha:"2026-04-10",arch:false},{id:12,nom:"Metodología de conciliación",est:"pendiente",fecha:"2026-04-14",arch:false}]},
      {id:5,nombre:"Normalización de la base contable",semIni:2,semFin:2,estado:"pendiente",avance:0,
       ents:[{id:13,nom:"Base contable normalizada",est:"pendiente",fecha:"2026-04-30",arch:false}]},
      {id:6,nombre:"Conciliación contable",semIni:3,semFin:3,estado:"pendiente",avance:0,
       ents:[{id:14,nom:"Activos conciliados",est:"pendiente",fecha:"2026-05-14",arch:false},{id:15,nom:"Activos faltantes",est:"pendiente",fecha:"2026-05-14",arch:false},{id:16,nom:"Activos sobrantes",est:"pendiente",fecha:"2026-05-14",arch:false}]},
      {id:7,nombre:"Levantamiento de observaciones",semIni:3,semFin:4,estado:"pendiente",avance:0,
       ents:[{id:17,nom:"Matriz de observaciones",est:"pendiente",fecha:"2026-05-28",arch:false},{id:18,nom:"Evidencias de levantamiento",est:"pendiente",fecha:"2026-06-05",arch:false}]},
      {id:8,nombre:"Validación del cliente",semIni:4,semFin:4,estado:"pendiente",avance:0,
       ents:[{id:19,nom:"Acta de validación firmada",est:"pendiente",fecha:"2026-06-14",arch:false}]},
      {id:9,nombre:"Informe final y cierre",semIni:4,semFin:5,estado:"pendiente",avance:0,
       ents:[{id:20,nom:"Informe final",est:"pendiente",fecha:"2026-06-20",arch:false},{id:21,nom:"Anexos técnicos",est:"pendiente",fecha:"2026-06-23",arch:false},{id:22,nom:"Acta de cierre y liquidación",est:"pendiente",fecha:"2026-06-23",arch:false}]},
    ],
    personal:[
      {cargo:"Jefe Soporte / Operativo",cot:48,  real:48,  costoCot:503},
      {cargo:"Consultor Senior",         cot:524, real:210, costoCot:4402},
      {cargo:"Supervisor",               cot:176, real:80,  costoCot:1007},
      {cargo:"Asistente Contable",       cot:160, real:40,  costoCot:915},
      {cargo:"Asistentes Mina ×12",      cot:1800,real:574, costoCot:9468},
    ],
    rubros:[
      {id:1,rubro:"Personal — Consultor Senior",   cotizado:4402,real:1764,comp:1200},
      {id:2,rubro:"Personal — Supervisor",         cotizado:1007,real:457, comp:300},
      {id:3,rubro:"Personal — Asistente Contable", cotizado:915, real:229, comp:100},
      {id:4,rubro:"Personal — Asistentes Mina ×12",cotizado:9468,real:3018,comp:2000},
      {id:5,rubro:"Gastos — Examen médico",        cotizado:1750,real:1750,comp:0},
      {id:6,rubro:"Gastos — Vacunas",              cotizado:1656,real:1656,comp:0},
      {id:7,rubro:"Gastos — Movilidad",            cotizado:400, real:120, comp:280},
      {id:8,rubro:"EPP — Mamelucos + equipo mina", cotizado:1170,real:1170,comp:0},
    ],
  },
  {
    id:"000004241", cliente:"Cía. Minera Poderosa", ruc:"20338591551",
    proyecto:"Inventario AF — Sede Pataz",
    division:"Consultoría Activo Fijo", valor:18200, avance:80, margen:22.8,
    faseActual:6, fase:"Fase 6 — Conciliación", estado:"ejecucion",
    cobrado:9100, pendiente:9100, horasCot:1850, horasReal:1480, activosPresupuestados:2800, costoUnitAdicional:2.00,
    inicio:"2026-02-02", fin:"2026-04-30", plazo:12, jefe:"Ana Torres",
    documentos:[
      {id:"D010",nom:"Acta de inicio firmada",tipo:"acta",fecha:"2026-02-02",subido:true,url:"#",size:"220 KB"},
      {id:"D011",nom:"Informe final preliminar",tipo:"informe",fecha:"2026-04-20",subido:false,url:null,size:null},
    ],
    cobros:[
      {n:1,monto:4550,fecha:"2026-02-09",estado:"cobrado"},
      {n:2,monto:4550,fecha:"2026-03-09",estado:"cobrado"},
      {n:3,monto:4550,fecha:"2026-04-09",estado:"pendiente"},
      {n:4,monto:4550,fecha:"2026-04-30",estado:"pendiente"},
    ],
    fases:[
      {id:1,nombre:"Acta de inicio y movilización",semIni:1,semFin:1,estado:"completada",avance:100,ents:[]},
      {id:2,nombre:"Planeamiento y organización del inventario",semIni:1,semFin:1,estado:"completada",avance:100,ents:[]},
      {id:3,nombre:"Inventario físico + Control de calidad",semIni:2,semFin:3,estado:"completada",avance:100,ents:[]},
      {id:4,nombre:"Planeamiento y organización contable",semIni:1,semFin:2,estado:"completada",avance:100,ents:[]},
      {id:5,nombre:"Normalización de la base contable",semIni:2,semFin:2,estado:"completada",avance:100,ents:[]},
      {id:6,nombre:"Conciliación contable",semIni:3,semFin:3,estado:"en_curso",avance:60,
       ents:[{id:21,nom:"Activos conciliados",est:"entregado",fecha:"2026-03-28",arch:true},{id:22,nom:"Activos faltantes",est:"en_curso",fecha:"2026-04-15",arch:false},{id:23,nom:"Activos sobrantes",est:"pendiente",fecha:"2026-04-20",arch:false}]},
      {id:7,nombre:"Levantamiento de observaciones",semIni:3,semFin:4,estado:"pendiente",avance:0,ents:[]},
      {id:8,nombre:"Validación del cliente",semIni:4,semFin:4,estado:"pendiente",avance:0,ents:[]},
      {id:9,nombre:"Informe final y cierre",semIni:4,semFin:5,estado:"pendiente",avance:0,ents:[]},
    ],
    personal:[
      {cargo:"Consultor Senior",   cot:400,real:380,costoCot:3360},
      {cargo:"Supervisor",         cot:300,real:290,costoCot:1716},
      {cargo:"Asistente Contable", cot:200,real:195,costoCot:1144},
      {cargo:"Asistentes Mina ×8", cot:950,real:615,costoCot:4992},
    ],
    rubros:[
      {id:1,rubro:"Personal — Consultor Senior",   cotizado:3360,real:3200,comp:160},
      {id:2,rubro:"Personal — Supervisor",         cotizado:1716,real:1600,comp:116},
      {id:3,rubro:"Personal — Asistentes Mina ×8", cotizado:4992,real:3240,comp:1200},
      {id:4,rubro:"Gastos — Viáticos",             cotizado:2200,real:2100,comp:100},
      {id:5,rubro:"EPP — Equipos básicos",         cotizado:840, real:840, comp:0},
    ],
  },
  {
    id:"000004258", cliente:"Supermercados Peruanos", ruc:"20100070970",
    proyecto:"Inventario AF — Red de Tiendas Lima",
    division:"Consultoría Activo Fijo", valor:34000, avance:12, margen:19.5,
    faseActual:1, fase:"Fase 1 — Acta de inicio", estado:"inicio",
    cobrado:0, pendiente:34000, horasCot:3200, horasReal:384,  activosPresupuestados:6500, costoUnitAdicional:1.80,
    inicio:"2026-04-01", fin:"2026-06-30", plazo:13, jefe:"Carlos Quispe",
    documentos:[
      {id:"D020",nom:"Acta de inicio firmada",tipo:"acta",fecha:"2026-04-01",subido:false,url:null,size:null},
      {id:"D021",nom:"Plan de inventario",tipo:"plan",fecha:"2026-04-07",subido:false,url:null,size:null},
    ],
    cobros:[
      {n:1,monto:8500,fecha:"2026-04-07",estado:"pendiente"},
      {n:2,monto:8500,fecha:"2026-05-07",estado:"pendiente"},
      {n:3,monto:8500,fecha:"2026-06-07",estado:"pendiente"},
      {n:4,monto:8500,fecha:"2026-06-30",estado:"pendiente"},
    ],
    fases:[
      {id:1,nombre:"Acta de inicio y movilización",semIni:1,semFin:1,estado:"en_curso",avance:60,
       ents:[{id:30,nom:"Acta de inicio firmada",est:"en_curso",fecha:"2026-04-07",arch:false},{id:31,nom:"Plan de movilización",est:"pendiente",fecha:"2026-04-07",arch:false}]},
      {id:2,nombre:"Planeamiento y organización del inventario",semIni:1,semFin:1,estado:"pendiente",avance:0,
       ents:[{id:32,nom:"Cronograma detallado",est:"pendiente",fecha:"2026-04-07",arch:false},{id:33,nom:"Catálogo AF",est:"pendiente",fecha:"2026-04-07",arch:false},{id:34,nom:"Maestros de ubicaciones",est:"pendiente",fecha:"2026-04-07",arch:false}]},
      {id:3,nombre:"Inventario físico + Control de calidad",semIni:2,semFin:3,estado:"pendiente",avance:0,ents:[]},
      {id:4,nombre:"Planeamiento y organización contable",semIni:1,semFin:2,estado:"pendiente",avance:0,ents:[]},
      {id:5,nombre:"Normalización de la base contable",semIni:2,semFin:2,estado:"pendiente",avance:0,ents:[]},
      {id:6,nombre:"Conciliación contable",semIni:3,semFin:3,estado:"pendiente",avance:0,ents:[]},
      {id:7,nombre:"Levantamiento de observaciones",semIni:3,semFin:4,estado:"pendiente",avance:0,ents:[]},
      {id:8,nombre:"Validación del cliente",semIni:4,semFin:4,estado:"pendiente",avance:0,ents:[]},
      {id:9,nombre:"Informe final y cierre",semIni:4,semFin:5,estado:"pendiente",avance:0,ents:[]},
    ],
    personal:[
      {cargo:"Consultor Senior",    cot:600, real:96, costoCot:5040},
      {cargo:"Supervisor",          cot:400, real:48, costoCot:2288},
      {cargo:"Asistente Contable",  cot:300, real:0,  costoCot:1716},
      {cargo:"Asistentes Mina ×10", cot:1900,real:240,costoCot:9975},
    ],
    rubros:[
      {id:1,rubro:"Personal — Consultor Senior",    cotizado:5040,real:806, comp:1000},
      {id:2,rubro:"Personal — Supervisor",          cotizado:2288,real:274, comp:500},
      {id:3,rubro:"Personal — Asistentes Mina ×10", cotizado:9975,real:1263,comp:2000},
      {id:4,rubro:"Gastos — Viáticos",              cotizado:1800,real:0,   comp:400},
      {id:5,rubro:"EPP — Equipos básicos",          cotizado:1050,real:1050,comp:0},
    ],
    cobros:[
      {n:1,monto:8500,estado:"pendiente",fecha:"2026-04-01",concepto:"Cuota 1 — Inicio de proyecto"},
      {n:2,monto:8500,estado:"pendiente",fecha:"2026-05-01",concepto:"Cuota 2 — Avance 50%"},
      {n:3,monto:8500,estado:"pendiente",fecha:"2026-06-01",concepto:"Cuota 3 — Entregables"},
      {n:4,monto:8500,estado:"pendiente",fecha:"2026-07-01",concepto:"Cuota 4 — Cierre"},
    ],
    fases:[
      {id:1,nombre:"Planeamiento y organización",semIni:1,semFin:2,estado:"en_curso",avance:60,ents:[{id:0,nom:"Acta de inicio",est:"entregado",fecha:"2026-03-28"},{id:1,nom:"Plan de inventario",est:"pendiente",fecha:"2026-04-05"}]},
      {id:2,nombre:"Inventario físico",semIni:2,semFin:5,estado:"pendiente",avance:0,ents:[{id:0,nom:"Reporte por tienda",est:"pendiente",fecha:"2026-05-10"}]},
      {id:3,nombre:"Conciliación contable",semIni:5,semFin:7,estado:"pendiente",avance:0,ents:[{id:0,nom:"Base conciliada",est:"pendiente",fecha:"2026-06-01"}]},
      {id:4,nombre:"Informe final",semIni:7,semFin:8,estado:"pendiente",avance:0,ents:[{id:0,nom:"Informe ejecutivo",est:"pendiente",fecha:"2026-06-20"}]},
    ],
  },
];

const LEADS_DEFAULT = {
  prospecto:[
    {id:"L001",exec:"Pedro Vargas",co:"Grupo Breca",ct:"Ing. Carlos Mendoza",rol:"Gerente AF",val:48000,score:74,sec:"Industrial",stage:"prospecto",last:"2026-04-01",prob:55,temp:"WARM",tags:["NIIF 13"],notes:"Maquinaria Callao y Lurín.",acts:[{t:"call",tx:"Llamada inicial",d:"01 Abr",u:"PV"}]},
    {id:"L002",exec:"Pedro Vargas",co:"Ferreyros S.A.",ct:"Ing. Roberto Silva",rol:"VP Finanzas",val:28000,score:77,sec:"Industrial",stage:"propuesta",last:"2026-04-05",prob:72,temp:"WARM",tags:["Inventario"],acts:[{t:"check",tx:"Cotización enviada",d:"05 Abr",u:"PV"}]},
    {id:"L003",exec:"Pedro Vargas",co:"Cía. Minera Poderosa",ct:"Ing. Luis Paredes",rol:"Gerente AF",val:18200,score:88,sec:"Minería",stage:"ganado",last:"2026-03-05",prob:100,temp:"HOT",tags:["Inventario"],notes:"Sede Pataz. En ejecución.",acts:[{t:"check",tx:"Contrato firmado",d:"05 Mar",u:"PV"}]},
    {id:"L201",exec:"Rodrigo Paz",co:"Hochschild Mining",ct:"Ing. César Málaga",rol:"VP Finanzas",val:52000,score:58,sec:"Minería",stage:"prospecto",last:"2026-04-09",prob:35,temp:"COLD",tags:["Mina","NIIF 13"],notes:"Unidades Ares y Inmaculada. Primer contacto vía referido.",acts:[{t:"call",tx:"Llamada de prospección",d:"09 Abr",u:"RP"},{t:"mail",tx:"Envío de brochure corporativo",d:"10 Abr",u:"RP"}]},
  ],
  calificado:[
    {id:"L101",exec:"Lucía Romero",co:"Alicorp S.A.A.",ct:"Ing. Rosa Díaz",rol:"Gerente de Activos",val:38000,score:72,sec:"Retail",stage:"calificado",last:"2026-04-10",prob:60,temp:"WARM",tags:["Inventario","NIIF"],notes:"Planta Ate y Callao. Reunión inicial exitosa.",acts:[{t:"meeting",tx:"Reunión de diagnóstico",d:"10 Abr",u:"LR"},{t:"mail",tx:"Envío de propuesta preliminar",d:"11 Abr",u:"LR"}]},
  ],
  propuesta:[
    {id:"L102",exec:"Lucía Romero",co:"Corporación Lindley",ct:"CPC. Jorge Huamán",rol:"Jefe de Contabilidad",val:22000,score:80,sec:"Retail",stage:"propuesta",last:"2026-04-08",prob:75,temp:"HOT",tags:["Conciliación"],notes:"Cotización enviada. Esperando aprobación de gerencia.",acts:[{t:"check",tx:"Cotización COT-2026-LR01 enviada",d:"08 Abr",u:"LR"},{t:"call",tx:"Seguimiento aprobación",d:"12 Abr",u:"LR"}]},
  ],
  negociacion:[
    {id:"L202",exec:"Rodrigo Paz",co:"Minsur S.A.",ct:"Dr. Álvaro Ruiz",rol:"Gerente General",val:67000,score:83,sec:"Minería",stage:"negociacion",last:"2026-04-11",prob:85,temp:"HOT",tags:["Inventario","Mina"],notes:"San Rafael Puno. Negociando alcance y precio.",acts:[{t:"meeting",tx:"Negociación de contrato",d:"11 Abr",u:"RP"},{t:"check",tx:"Cotización ajustada enviada",d:"12 Abr",u:"RP"}]},
  ],
  ganado:[
    {id:"L103",exec:"Lucía Romero",co:"Saga Falabella Perú",ct:"Dr. Manuel Torres",rol:"CFO",val:45000,score:95,sec:"Retail",stage:"ganado",last:"2026-03-15",prob:100,temp:"HOT",tags:["NIIF 16","Inventario"],notes:"Contrato firmado. 12 tiendas Lima.",acts:[{t:"check",tx:"Contrato firmado",d:"15 Mar",u:"LR"},{t:"check",tx:"Cuota 1 cobrada USD 11,250",d:"01 Abr",u:"SYS"}]},
    {id:"L104",exec:"Lucía Romero",co:"InRetail Perú",ct:"Ing. Patricia Vega",rol:"Gerente AF",val:31000,score:93,sec:"Retail",stage:"ganado",last:"2026-03-20",prob:100,temp:"HOT",tags:["Inventario"],notes:"Plaza Vea y Mass. En ejecución fase 2.",acts:[{t:"check",tx:"Kick-off realizado",d:"20 Mar",u:"LR"},{t:"check",tx:"Fase 1 completada",d:"05 Abr",u:"LR"}]},
    {id:"L105",exec:"Lucía Romero",co:"Cencosud Perú",ct:"Lic. Carmen Quispe",rol:"Subgerente Contable",val:28500,score:91,sec:"Retail",stage:"ganado",last:"2026-03-25",prob:100,temp:"HOT",tags:["Conciliación","NIIF"],notes:"Wong y Metro Lima. Fase inventario activa.",acts:[{t:"check",tx:"Contrato firmado",d:"25 Mar",u:"LR"},{t:"meeting",tx:"Reunión avance semana 2",d:"08 Abr",u:"LR"}]},
    {id:"L203",exec:"Rodrigo Paz",co:"Compañía Minera Antamina",ct:"Ing. Luis Herrera",rol:"Superintendente AF",val:88000,score:96,sec:"Minería",stage:"ganado",last:"2026-03-10",prob:100,temp:"HOT",tags:["Mina","NIIF"],notes:"Ancash. Avance 50%. Fase inventario en progreso.",acts:[{t:"check",tx:"Contrato firmado USD 88,000",d:"10 Mar",u:"RP"},{t:"check",tx:"Cuotas 1 y 2 cobradas",d:"05 Abr",u:"SYS"}]},
    {id:"L204",exec:"Rodrigo Paz",co:"Volcan Cía. Minera",ct:"CPC. Rosa Mendoza",rol:"Gerente Contable",val:41000,score:90,sec:"Minería",stage:"ganado",last:"2026-03-18",prob:100,temp:"HOT",tags:["Conciliación"],notes:"Unidad Yauli. Avance 50%. Conciliación en proceso.",acts:[{t:"check",tx:"Inicio de proyecto",d:"18 Mar",u:"RP"},{t:"meeting",tx:"Reunión de avance semana 3",d:"07 Abr",u:"RP"}]},
    {id:"L301",exec:"Sofía Herrera",co:"Southern Copper Corporation",ct:"Dr. Roberto Flores",rol:"Director Finanzas",val:120000,score:98,sec:"Minería",stage:"ganado",last:"2026-03-05",prob:100,temp:"HOT",tags:["Mina","NIIF 13","NIIF 16","Valuación"],notes:"Toquepala y Cuajone. Proyecto integral. Contrato marco anual.",acts:[{t:"check",tx:"Contrato marco firmado USD 120,000",d:"05 Mar",u:"SH"},{t:"check",tx:"Kick-off Toquepala realizado",d:"12 Mar",u:"SH"},{t:"check",tx:"Fase 1 completada",d:"28 Mar",u:"SH"},{t:"check",tx:"Cuotas 1,2,3 cobradas USD 90,000",d:"10 Abr",u:"SYS"}]},
  ],
};

const COTS_DEFAULT = [
  {id:"COT-2026-010", leadId:"L004", cliente:"Cementos Pacasmayo",
    contacto:"Dr. Pedro Alva", cargo:"Gerente de Activos",
    email:"palva@cementospacasmayo.com.pe",
    proyecto:"Inventario y Conciliación del Activo Fijo",
    servicio:"Inventario de Activo Fijo", sector:"Industrial",
    venta:22000, valor:22000, costo:0, margen:0,
    estado:"prospecto", autor:"Wilmer Moreno V.",
    fecha:"04/04/2026", cuotas:4, plazo:"10 semanas",
    personal:[], epp:[], gastos:[],
    notas:"Cliente nuevo. Reunión inicial pendiente.", tags:["Inventario","NIIF"],
  },
  {id:"COT-2026-004", leadId:"L006",cliente:"Cía. Minera SIMSA",                proyecto:"Inventario y Conciliación AF",              fecha:"20/03/2026",venta:26500,costo:20079,margen:24.1,estado:"ganado",autor:"Wilmer Moreno V.",cuotas:4,servicio:"Inventario y Conciliación del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe Soporte / Operativo",cant:1,horas:48, tarifa:10.48},
     {id:2,cargo:"Jefe Soporte",             cant:1,horas:8,  tarifa:10.48},
     {id:3,cargo:"Coord. Seguridad",         cant:1,horas:24, tarifa:8.40},
     {id:4,cargo:"Consultor Senior",         cant:2,horas:262,tarifa:8.40},
     {id:5,cargo:"Supervisor",               cant:1,horas:176,tarifa:5.72},
     {id:6,cargo:"Asistente Contable",       cant:1,horas:160,tarifa:5.72},
     {id:7,cargo:"Asistente Mina",           cant:12,horas:150,tarifa:0.53},
   ]},
  {id:"COT-2026-003", leadId:"L007",cliente:"Cía. Minera Poderosa",proyecto:"Inventario AF — Sede Pataz",                fecha:"05/03/2026",venta:18200,costo:14062,margen:22.8,estado:"ganado",autor:"Wilmer Moreno V.",cuotas:4,servicio:"Inventario y Conciliación del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe Soporte / Operativo",cant:1,horas:40, tarifa:10.48},
     {id:2,cargo:"Consultor Senior",         cant:2,horas:200,tarifa:8.40},
     {id:3,cargo:"Supervisor",               cant:1,horas:140,tarifa:5.72},
     {id:4,cargo:"Asistente Contable",       cant:1,horas:120,tarifa:5.72},
     {id:5,cargo:"Asistente Mina",           cant:8, horas:140,tarifa:0.53},
   ]},
  {id:"COT-2026-005", leadId:"L001",cliente:"Grupo Breca",           proyecto:"Valuación NIIF 13 — Callao",               fecha:"25/03/2026",venta:48000,costo:37440,margen:22.0,estado:"calificado",autor:"Pedro Vargas",cuotas:4,servicio:"Valuación Comercial y Servicios Especializados",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",         cant:1,horas:80, tarifa:10.48},
     {id:2,cargo:"Valuador Senior",           cant:2,horas:320,tarifa:8.40},
     {id:3,cargo:"Consultor Funcional",       cant:2,horas:280,tarifa:5.72},
     {id:4,cargo:"Asistente Contable",        cant:2,horas:200,tarifa:5.72},
   ]},
  {id:"COT-2026-006", leadId:"L002",cliente:"Backus AB InBev",       proyecto:"Inventario AF — Plantas Lima",             fecha:"27/03/2026",venta:14500,costo:11455,margen:21.0,estado:"propuesta",autor:"Pedro Vargas",cuotas:3,servicio:"Inventario de Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe Soporte / Operativo",cant:1,horas:32, tarifa:10.48},
     {id:2,cargo:"Consultor Senior",         cant:1,horas:160,tarifa:8.40},
     {id:3,cargo:"Supervisor",               cant:1,horas:120,tarifa:5.72},
     {id:4,cargo:"Asistente de Inventario",  cant:4, horas:100,tarifa:0.53},
   ]},
  {id:"COT-2026-007", leadId:"L008",cliente:"Supermercados Peruanos",proyecto:"Inventario AF — Red de Tiendas",           fecha:"01/04/2026",venta:34000,costo:27540,margen:19.5,estado:"ganado",autor:"Wilmer Moreno V.",cuotas:4,servicio:"Inventario de Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",         cant:1,horas:64, tarifa:10.48},
     {id:2,cargo:"Consultor Senior",         cant:2,horas:240,tarifa:8.40},
     {id:3,cargo:"Supervisor",               cant:2,horas:180,tarifa:5.72},
     {id:4,cargo:"Asistente Contable",       cant:1,horas:160,tarifa:5.72},
     {id:5,cargo:"Asistente de Inventario",  cant:6, horas:120,tarifa:0.53},
   ]},
  {id:"COT-2026-008", leadId:"L005",cliente:"Ferreyros S.A.",         proyecto:"Inventario AF — Sede Central y Sucursales",fecha:"28/03/2026",venta:28000,costo:21980,margen:21.5,estado:"propuesta",autor:"Wilmer Moreno V.",cuotas:3,servicio:"Inventario de Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe Soporte / Operativo",cant:1,horas:40, tarifa:10.48},
     {id:2,cargo:"Consultor Senior",         cant:2,horas:180,tarifa:8.40},
     {id:3,cargo:"Supervisor",               cant:1,horas:140,tarifa:5.72},
     {id:4,cargo:"Asistente Contable",       cant:1,horas:120,tarifa:5.72},
     {id:5,cargo:"Asistente de Inventario",  cant:4, horas:100,tarifa:0.53},
   ]},
  {id:"COT-2026-009", leadId:"L003",cliente:"Tottus / Falabella",     proyecto:"Valuación y Conciliación AF — 12 Tiendas", fecha:"01/04/2026",venta:85000,costo:66300,margen:22.0,estado:"propuesta",autor:"Pedro Vargas",cuotas:4,servicio:"Inventario de Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",         cant:1,horas:80, tarifa:10.48},
     {id:2,cargo:"Consultor Senior",         cant:3,horas:280,tarifa:8.40},
     {id:3,cargo:"Supervisor",               cant:2,horas:200,tarifa:5.72},
     {id:4,cargo:"Asistente Contable",       cant:2,horas:180,tarifa:5.72},
     {id:5,cargo:"Asistente de Inventario",  cant:8, horas:160,tarifa:0.53},
   ]},
  // ── Cotizaciones Lucía Romero ──
  {id:"COT-2026-LR01",leadId:"L103",cliente:"Saga Falabella Perú",proyecto:"Inventario y Conciliación AF — 12 Tiendas Lima",fecha:"10/03/2026",venta:45000,costo:34560,margen:23.2,estado:"ganado",autor:"Lucía Romero",cuotas:4,servicio:"Inventario y Conciliación Contable del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:80, tarifa:10.48},
     {id:2,cargo:"Consultor Funcional",     cant:2,horas:240,tarifa:7.40},
     {id:3,cargo:"Supervisor de Inventario",cant:2,horas:200,tarifa:4.73},
     {id:4,cargo:"Asistente Contable",      cant:2,horas:160,tarifa:4.73},
     {id:5,cargo:"Asistente de Inventario", cant:8,horas:120,tarifa:3.74},
   ],
   epp:[
     {id:0,cat:"Cuerpo",item:"Chaleco Nexova",cant:15,tallas:[{talla:"S",cant:3},{talla:"M",cant:7},{talla:"L",cant:5}]},
     {id:1,cat:"Cabeza",item:"Casco Blanco",cant:15,tallas:[]},
     {id:2,cat:"Pies",item:"Botas punta de acero",cant:15,tallas:[{talla:"39",cant:2},{talla:"40",cant:5},{talla:"41",cant:5},{talla:"42",cant:3}]},
     {id:3,cat:"Visual",item:"Lentes de seguridad",cant:15,tallas:[]},
   ],
   terminales:{cant:6,tipo:"manual",fechaEntrega:"",fechaDev:""},
   laptops:{cant:3,detalle:"HP EliteBook"},
   sitia:{req:true,cant:6},
   etiquetasPoliester:{cant:5,tipo:"codigo_barras"},
   etiquetasPapel:{cant:2,tipo:"codigo_barras"},
   placas:{placaA234:200,placaA21:100,placaB234:150,placaB21:80},
   viaticos:[
     {id:1,concepto:"Pasajes Lima-tiendas",personas:8,monto:15,dias:20},
     {id:2,concepto:"Alimentación diaria",personas:8,monto:25,dias:20},
   ],
  },
  {id:"COT-2026-LR02",leadId:"L104",cliente:"InRetail Perú",proyecto:"Inventario AF — Plaza Vea y Mass Lima",fecha:"15/03/2026",venta:31000,costo:23560,margen:24.0,estado:"ganado",autor:"Lucía Romero",cuotas:4,servicio:"Inventario de Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:60, tarifa:10.48},
     {id:2,cargo:"Consultor Funcional",     cant:1,horas:180,tarifa:7.40},
     {id:3,cargo:"Supervisor de Inventario",cant:1,horas:160,tarifa:4.73},
     {id:4,cargo:"Asistente de Inventario", cant:6,horas:100,tarifa:3.74},
   ],
   terminales:{cant:4,tipo:"rf",fechaEntrega:"",fechaDev:""},
   laptops:{cant:2,detalle:"Lenovo ThinkPad"},
   etiquetasPoliester:{cant:3,tipo:"codigo_barras"},
   placas:{placaA234:120,placaA21:80,placaB234:0,placaB21:0},
  },
  {id:"COT-2026-LR03",leadId:"L105",cliente:"Cencosud Perú",proyecto:"Conciliación Contable AF — Wong y Metro",fecha:"20/03/2026",venta:28500,costo:21660,margen:24.0,estado:"ganado",autor:"Lucía Romero",cuotas:3,servicio:"Inventario y Conciliación Contable del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:56, tarifa:10.48},
     {id:2,cargo:"Consultor Contable",      cant:2,horas:160,tarifa:7.40},
     {id:3,cargo:"Asistente Contable",      cant:2,horas:140,tarifa:4.73},
     {id:4,cargo:"Asistente de Inventario", cant:4,horas:80, tarifa:3.74},
   ],
   etiquetasPoliester:{cant:2,tipo:"codigo_barras"},
   placas:{placaA234:80,placaA21:50,placaB234:0,placaB21:0},
  },
  // ── Cotizaciones Rodrigo Paz ──
  {id:"COT-2026-RP01",leadId:"L203",cliente:"Compañía Minera Antamina",proyecto:"Inventario y Conciliación AF — Ancash",fecha:"05/03/2026",venta:88000,costo:66880,margen:24.0,estado:"ganado",autor:"Rodrigo Paz",cuotas:4,servicio:"Inventario y Conciliación Contable del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:120,tarifa:10.48},
     {id:2,cargo:"Consultor Funcional",     cant:2,horas:320,tarifa:7.40},
     {id:3,cargo:"Supervisor de Inventario",cant:2,horas:280,tarifa:4.73},
     {id:4,cargo:"Asistente Contable",      cant:2,horas:240,tarifa:4.73},
     {id:5,cargo:"Asistente de Inventario", cant:14,horas:200,tarifa:3.74},
     {id:6,cargo:"Coordinador SIG",         cant:1,horas:80, tarifa:9.37},
   ],
   epp:[
     {id:0,cat:"Cuerpo",item:"Mameluco",cant:20,tallas:[{talla:"S",cant:2},{talla:"M",cant:8},{talla:"L",cant:7},{talla:"XL",cant:3}]},
     {id:1,cat:"Cuerpo",item:"Chaleco Plomo",cant:20,tallas:[{talla:"M",cant:10},{talla:"L",cant:10}]},
     {id:2,cat:"Cabeza",item:"Casco Amarillo",cant:20,tallas:[]},
     {id:3,cat:"Pies",item:"Botas punta de acero",cant:20,tallas:[{talla:"40",cant:4},{talla:"41",cant:8},{talla:"42",cant:6},{talla:"43",cant:2}]},
     {id:4,cat:"Visual",item:"Lentes de seguridad",cant:20,tallas:[]},
     {id:5,cat:"Visual",item:"Mascarilla con filtro",cant:20,tallas:[]},
   ],
   terminales:{cant:10,tipo:"rf",fechaEntrega:"2026-03-08",fechaDev:"2026-06-08"},
   laptops:{cant:4,detalle:"HP ProBook"},
   sitia:{req:true,cant:10},
   etiquetasPoliester:{cant:8,tipo:"codigo_barras"},
   placas:{placaA234:500,placaA21:300,placaB234:200,placaB21:100},
   viaticos:[
     {id:1,concepto:"Pasajes Lima-Ancash (vuelo)",personas:6,monto:280,dias:1},
     {id:2,concepto:"Alojamiento campo",personas:20,monto:45,dias:25},
     {id:3,concepto:"Alimentación diaria",personas:20,monto:30,dias:25},
     {id:4,concepto:"Movilidad interna",personas:20,monto:15,dias:25},
   ],
  },
  {id:"COT-2026-RP02",leadId:"L204",cliente:"Volcan Cía. Minera",proyecto:"Inventario AF — Unidad Yauli",fecha:"12/03/2026",venta:41000,costo:31160,margen:24.0,estado:"ganado",autor:"Rodrigo Paz",cuotas:4,servicio:"Inventario y Conciliación Contable del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:80, tarifa:10.48},
     {id:2,cargo:"Consultor Funcional",     cant:1,horas:240,tarifa:7.40},
     {id:3,cargo:"Supervisor de Inventario",cant:1,horas:200,tarifa:4.73},
     {id:4,cargo:"Asistente de Inventario", cant:8,horas:160,tarifa:3.74},
   ],
   epp:[
     {id:0,cat:"Cuerpo",item:"Mameluco",cant:10,tallas:[{talla:"M",cant:5},{talla:"L",cant:3},{talla:"XL",cant:2}]},
     {id:1,cat:"Cabeza",item:"Casco Amarillo",cant:10,tallas:[]},
     {id:2,cat:"Pies",item:"Botas de jebe",cant:10,tallas:[{talla:"40",cant:3},{talla:"41",cant:4},{talla:"42",cant:3}]},
   ],
   terminales:{cant:6,tipo:"manual",fechaEntrega:"",fechaDev:""},
   laptops:{cant:2,detalle:""},
   etiquetasPoliester:{cant:5,tipo:"codigo_barras"},
   placas:{placaA234:300,placaA21:150,placaB234:100,placaB21:50},
   viaticos:[
     {id:1,concepto:"Pasajes Lima-Yauli",personas:4,monto:80,dias:2},
     {id:2,concepto:"Alojamiento",personas:10,monto:40,dias:18},
     {id:3,concepto:"Alimentación",personas:10,monto:25,dias:18},
   ],
  },
  // ── Cotización Sofía Herrera ──
  {id:"COT-2026-SH01",leadId:"L301",cliente:"Southern Copper Corporation",proyecto:"Inventario Integral AF — Toquepala y Cuajone",fecha:"28/02/2026",venta:120000,costo:90000,margen:25.0,estado:"ganado",autor:"Sofía Herrera",cuotas:4,servicio:"Inventario y Conciliación Contable del Activo Fijo",
   personal:[
     {id:1,cargo:"Jefe de Proyecto",        cant:1,horas:160,tarifa:10.48},
     {id:2,cargo:"Consultor Funcional",     cant:3,horas:400,tarifa:7.40},
     {id:3,cargo:"Consultor Contable",      cant:2,horas:320,tarifa:7.40},
     {id:4,cargo:"Supervisor de Inventario",cant:3,horas:360,tarifa:4.73},
     {id:5,cargo:"Asistente Contable",      cant:3,horas:280,tarifa:4.73},
     {id:6,cargo:"Asistente de Inventario", cant:20,horas:280,tarifa:3.74},
     {id:7,cargo:"Coordinador SIG",         cant:1,horas:120,tarifa:9.37},
     {id:8,cargo:"Perito Tasador",          cant:2,horas:160,tarifa:21.57},
   ],
   epp:[
     {id:0,cat:"Cuerpo",item:"Mameluco",cant:30,tallas:[{talla:"S",cant:2},{talla:"M",cant:12},{talla:"L",cant:10},{talla:"XL",cant:6}]},
     {id:1,cat:"Cuerpo",item:"Chaleco Plomo",cant:30,tallas:[{talla:"M",cant:15},{talla:"L",cant:15}]},
     {id:2,cat:"Cuerpo",item:"Casaca Térmica",cant:30,tallas:[{talla:"M",cant:15},{talla:"L",cant:15}]},
     {id:3,cat:"Cabeza",item:"Casco Amarillo",cant:30,tallas:[]},
     {id:4,cat:"Pies",item:"Botas punta de acero",cant:30,tallas:[{talla:"39",cant:2},{talla:"40",cant:8},{talla:"41",cant:10},{talla:"42",cant:8},{talla:"43",cant:2}]},
     {id:5,cat:"Visual",item:"Lentes de seguridad",cant:30,tallas:[]},
     {id:6,cat:"Visual",item:"Mascarilla con filtro",cant:30,tallas:[]},
   ],
   terminales:{cant:15,tipo:"rf",fechaEntrega:"2026-02-28",fechaDev:"2026-07-31"},
   laptops:{cant:6,detalle:"HP EliteBook"},
   sitia:{req:true,cant:15},
   sicex:{req:true,cant:3},
   etiquetasPoliester:{cant:15,tipo:"codigo_barras"},
   etiquetasPapel:{cant:5,tipo:"codigo_barras"},
   placas:{placaA234:1000,placaA21:500,placaB234:800,placaB21:400},
   viaticos:[
     {id:1,concepto:"Pasajes Lima-Tacna (vuelo)",personas:8,monto:380,dias:1},
     {id:2,concepto:"Alojamiento campo Toquepala",personas:30,monto:50,dias:30},
     {id:3,concepto:"Alimentación diaria",personas:30,monto:35,dias:30},
     {id:4,concepto:"Movilidad interna",personas:30,monto:20,dias:30},
     {id:5,concepto:"Exámenes médicos",personas:30,monto:85,dias:1},
   ],
  },
];

// ==============================================================================
// CSS GLOBAL  — NOTA: No se traduce ningún término técnico en inglés
// ==============================================================================
const css = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --r:6px;--font:'Segoe UI',system-ui,sans-serif;--mono:'Consolas',monospace;
  --sw:240px;--hh:56px;
  --navy:#1E293B;--blue:#0D9488;--teal:#0F766E;--amber:#D97706;--red:#DC2626;
  --bg:#F4F6F8;--card:#fff;--sb:#1a2e4a;--hd:#fff;
  --t1:#0F172A;--t2:#334155;--t3:#64748B;
  --bd:#E2E8F0;--hv:#F4F6F8;--sh:0 1px 3px rgba(0,0,0,.07);
}
[data-dark=true]{--bg:#0d1825;--card:#152032;--sb:#0a1520;--hd:#111e30;--t1:#e8f0f8;--t2:#8fa3b8;--t3:#4a5e72;--bd:#1e3048;--hv:#1e3048;--sh:0 1px 3px rgba(0,0,0,.25)}
body,#root{height:100vh;font-family:var(--font);font-size:13px;overflow:hidden}
button{cursor:pointer;border:none;background:none;font-family:inherit;font-size:inherit}
input,select,textarea{font-family:inherit;font-size:inherit;color:var(--t1);background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:6px 10px;width:100%;outline:none;transition:border-color .15s}
input:focus,select:focus,textarea:focus{border-color:#4a9fd4;box-shadow:0 0 0 2px rgba(74,159,212,.15)}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px}
.app{display:flex;height:100vh;background:var(--bg);color:var(--t1);overflow:hidden}
.sb{width:var(--sw);background:var(--sb);display:flex;flex-direction:column;transition:width .25s;overflow:hidden;flex-shrink:0}
.sb.col{width:60px}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.hdr{height:var(--hh);background:var(--hd);border-bottom:1px solid var(--bd);display:flex;align-items:center;padding:0 20px;gap:12px;flex-shrink:0}
.cnt{flex:1;overflow-y:auto;padding:20px}
.sb-logo{padding:0 16px;height:56px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}
.sb-lt{color:#fff;font-weight:800;font-size:13px;white-space:nowrap;transition:opacity .2s;line-height:1.2}
.sb.col .sb-lt{opacity:0;width:0;overflow:hidden}
.sb-sec{padding:6px 0}
.sb-lbl{font-size:9.5px;font-weight:700;letter-spacing:1.2px;color:rgba(255,255,255,.32);padding:12px 16px 3px;text-transform:uppercase;white-space:nowrap;transition:opacity .2s}
.sb.col .sb-lbl{opacity:0}
.sbi{display:flex;align-items:center;gap:10px;padding:7px 16px;margin:0;color:rgba(255,255,255,.55);cursor:pointer;border-radius:8px;transition:all .18s cubic-bezier(.4,0,.2,1);white-space:nowrap;border:1px solid transparent;position:relative}
.sbi:hover{background:rgba(255,255,255,.06);color:#fff}
.sbi.act{background:rgba(74,159,212,.15);color:#4a9fd4;border-left-color:#4a9fd4}
.sbi.act::before{content:'';position:absolute;left:0;top:20%;height:60%;width:3px;background:#4a9fd4;border-radius:0 3px 3px 0;margin-left:-10px}
.sbi svg{flex-shrink:0;opacity:.6;transition:opacity .18s}
.sbi:hover svg,.sbi.act svg{opacity:1}
.sbi-l{font-size:13px;font-weight:500;transition:opacity .2s;letter-spacing:.1px}
.sb.col .sbi-l{opacity:0;width:0;overflow:hidden}
.sb-bdg{margin-left:auto;min-width:18px;height:18px;background:#E24B4A;color:#fff;font-size:9px;font-weight:800;padding:0 5px;border-radius:9px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(226,75,74,.3)}
.sb.col .sb-bdg{display:none}
.sb-user{padding:10px 14px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px}
.sb-ui{flex:1;overflow:hidden;transition:opacity .2s}
.sb.col .sb-ui{opacity:0;width:0;overflow:hidden}
.sb-tog{padding:8px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.3);cursor:pointer;transition:color .15s}
.sb-tog:hover{color:#fff}
.card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--sh)}
.card-hd{padding:12px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.ct{font-size:13px;font-weight:600;color:var(--t1)}
.cs{font-size:11px;color:var(--t3);margin-top:1px}
.cb{padding:14px 16px}
.pill{display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;gap:3px}
.pill.blue{background:rgba(74,159,212,.1);color:#4a9fd4}
.pill.teal{background:rgba(29,158,117,.1);color:#1D9E75}
.pill.amber{background:rgba(186,117,23,.1);color:#BA7517}
.pill.red{background:rgba(226,75,74,.1);color:#E24B4A}
.pill.navy{background:rgba(30,41,59,.1);color:#1E293B}
.pill.purple{background:rgba(124,58,237,.1);color:#7c3aed}
[data-dark=true] .pill.navy{background:rgba(74,159,212,.1);color:#4a9fd4}
.btn{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:var(--r);font-size:12px;font-weight:600;transition:all .15s;cursor:pointer;border:none}
.btn-p{background:#0F766E;color:#fff;border-color:#0F766E}.btn-p:hover{background:#3a8fc4}
.btn-s{background:var(--hv);color:var(--t1);border:1px solid var(--bd)}.btn-s:hover{background:var(--bd)}
.btn-g{background:rgba(29,158,117,.1);color:#1D9E75;border:1px solid rgba(29,158,117,.2)}.btn-g:hover{background:rgba(29,158,117,.18)}
.btn-r{background:rgba(226,75,74,.1);color:#E24B4A;border:1px solid rgba(226,75,74,.2)}.btn-r:hover{background:rgba(226,75,74,.18)}
.btn-sm{padding:4px 9px;font-size:11px}
.btn-xs{padding:3px 7px;font-size:10px}
.toast-c{position:fixed;bottom:18px;right:80px;z-index:999;display:flex;flex-direction:column;gap:7px;pointer-events:none}
.toast{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--t1);box-shadow:0 4px 16px rgba(0,0,0,.1);animation:sli .2s ease;min-width:260px;pointer-events:all}
@keyframes sli{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
.skel{background:var(--bd);border-radius:3px;animation:pls 1.4s ease-in-out infinite}
@keyframes pls{0%,100%{opacity:1}50%{opacity:.45}}
.sh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px;flex-wrap:wrap}
.st{font-size:16px;font-weight:700;color:var(--t1)}
.ss{font-size:12px;color:var(--t3);margin-top:1px}
.mono{font-family:var(--mono)}
.tab-bar{display:flex;background:var(--bg);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;margin-bottom:16px}
.tab-item{flex:1;padding:8px;text-align:center;font-size:12px;font-weight:600;color:var(--t2);cursor:pointer;transition:all .15s;border-right:1px solid var(--bd)}
.tab-item:last-child{border-right:none}
.tab-item.act{background:var(--card);color:#4a9fd4}
.tab-item:hover:not(.act){background:var(--hv)}
.kpi{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:13px 15px;position:relative;overflow:hidden}
.kpi::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px}
.kpi.blue::before{background:#4a9fd4}.kpi.teal::before{background:#1D9E75}
.kpi.amber::before{background:#BA7517}.kpi.red::before{background:#E24B4A}
.kpi.navy::before{background:#1E293B}.kpi.purple::before{background:#7c3aed}
.kpi-l{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:4px}
.kpi-v{font-size:20px;font-weight:700;color:var(--t1);font-family:var(--mono);line-height:1;margin-bottom:3px}
.kpi-s{font-size:11px;color:var(--t2)}
table{width:100%;border-collapse:collapse}
th{padding:7px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--t3);border-bottom:1px solid var(--bd);background:var(--bg)}.th-inv th{color:#fff!important;background:transparent!important;border-bottom:none!important}
td{padding:8px 12px;font-size:12px;color:var(--t1);border-bottom:1px solid var(--bd);vertical-align:middle}
tr:hover td{background:var(--hv)}
tr:last-child td{border-bottom:none}
.a-row{display:flex;align-items:flex-start;gap:10px;padding:9px 16px;border-bottom:1px solid var(--bd);transition:background .1s}
.a-row:hover{background:var(--hv)}.a-row:last-child{border-bottom:none}
.a-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px}
.fi{display:flex;gap:10px;padding:9px 16px;border-bottom:1px solid var(--bd)}
.fi:last-child{border-bottom:none}
.stat-box{background:var(--bg);border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;text-align:center}
.kb{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;min-height:440px}
.kcol{min-width:210px;width:210px;display:flex;flex-direction:column;background:var(--bg);border-radius:var(--r);flex-shrink:0}
.kcol-hd{padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bd)}
.kcol-cnt{font-size:10px;background:var(--hv);color:var(--t2);padding:1px 6px;border-radius:10px;font-weight:600}
.kcards{flex:1;padding:8px;display:flex;flex-direction:column;gap:8px;overflow-y:auto}
.kcard.dragging{opacity:.4;border:2px dashed var(--blue)}
@keyframes highlight-pulse{0%{box-shadow:0 0 0 0 rgba(220,38,38,.7)}70%{box-shadow:0 0 0 10px rgba(220,38,38,0)}100%{box-shadow:0 0 0 0 rgba(220,38,38,0)}}
@keyframes update-pulse{0%{box-shadow:0 0 0 0 rgba(13,148,136,.5)}70%{box-shadow:0 0 0 8px rgba(13,148,136,0)}100%{box-shadow:0 0 0 0 rgba(13,148,136,0)}}
.new-badge{position:absolute;top:-8px;right:-8px;background:#0D9488;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:8px;z-index:100;animation:fadeout 4s ease forwards;pointer-events:none;white-space:nowrap}
@keyframes fadeout{0%{opacity:1}70%{opacity:1}100%{opacity:0}}
.highlight-new{animation:highlight-pulse .6s ease 3;outline:2px solid #0D9488;outline-offset:3px;position:relative}
.kcard{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:11px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.kcard:hover{border-color:#4a9fd4;box-shadow:0 2px 8px rgba(74,159,212,.15)}
.kcard.sel{border-color:#4a9fd4;box-shadow:0 0 0 2px rgba(74,159,212,.2)}
.kc-sc{font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px}
.kc-sc.hot{background:rgba(226,75,74,.1);color:#E24B4A}
.kc-sc.warm{background:rgba(186,117,23,.1);color:#BA7517}
.kc-sc.cold{background:rgba(74,159,212,.1);color:#4a9fd4}
.lp{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);height:100%;display:flex;flex-direction:column;overflow:hidden;min-height:440px}
.lp-hd{padding:14px;border-bottom:1px solid var(--bd)}
.lp-body{flex:1;overflow-y:auto}
.lp-sec{padding:11px 14px;border-bottom:1px solid var(--bd)}
.lp-st{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--t3);margin-bottom:7px}
.as{background:var(--hv);border:1px solid var(--bd);border-radius:var(--r);padding:9px 10px;margin-bottom:7px;display:flex;gap:7px;cursor:pointer;transition:border-color .15s}
.as:hover{border-color:#4a9fd4}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:12px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.fl{font-size:11px;font-weight:600;color:var(--t2);margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:.5px}
/* Modal overlay */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px)}
.modal{background:var(--card);border:1px solid var(--bd);border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,.2);width:500px;max-width:95vw;max-height:90vh;overflow-y:auto}
.modal-hd{padding:18px 20px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between}
.modal-bd{padding:20px}
.modal-ft{padding:14px 20px;border-top:1px solid var(--bd);display:flex;justify-content:flex-end;gap:8px}
/* Upload zone */
.upload-zone{border:2px dashed var(--bd);border-radius:var(--r);padding:28px;text-align:center;cursor:pointer;transition:all .2s}
.upload-zone:hover,.upload-zone.drag{border-color:#4a9fd4;background:rgba(74,159,212,.04)}
/* Login */
.login-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a1628 0%,#0F766E18 50%,#1E293B 100%);position:relative;overflow:hidden}
.login-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(74,159,212,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(74,159,212,.04) 1px,transparent 1px);background-size:40px 40px}
.login-card{position:relative;z-index:1;width:430px;background:rgba(255,255,255,.04);border:1px solid rgba(15,118,110,.25);border-radius:12px;backdrop-filter:blur(12px);padding:40px;box-shadow:0 24px 64px rgba(0,0,0,.4)}
.l-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(15,118,110,.2);border-radius:var(--r);padding:11px 14px 11px 40px;color:#fff;font-size:13px;font-family:inherit;outline:none;transition:border-color .2s;margin-bottom:14px}
.l-input::placeholder{color:rgba(255,255,255,.2)}
.l-input:focus{border-color:#0D9488;background:rgba(13,148,136,.08)}
.l-btn{width:100%;padding:13px;border-radius:var(--r);border:none;cursor:pointer;background:linear-gradient(135deg,#0F766E,#0D9488);color:#fff;font-size:14px;font-weight:700;font-family:'Sora',inherit;transition:all .2s;margin-top:6px}
.l-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,118,110,.35)}
.l-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.l-err{background:rgba(226,75,74,.12);border:1px solid rgba(226,75,74,.3);border-radius:var(--r);padding:10px 14px;color:#f87171;font-size:12px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.demo-u{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:var(--r);cursor:pointer;transition:background .15s;border:1px solid transparent}
.demo-u:hover{background:rgba(255,255,255,.06);border-color:rgba(74,159,212,.2)}
.splash{position:fixed;inset:0;background:linear-gradient(135deg,#0F766E 0%,#1E293B 100%);display:flex;align-items:center;justify-content:center;z-index:9998;animation:splashOut .4s ease 2s forwards}
@keyframes splashOut{to{opacity:0;pointer-events:none}}
@keyframes splashIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes dot{to{background:rgba(74,159,212,1)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes chatIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.save-ind{position:fixed;bottom:18px;left:18px;font-size:11px;font-weight:600;border-radius:6px;padding:5px 12px;display:flex;align-items:center;gap:6px;z-index:100;pointer-events:none;transition:all .3s}
.save-ind.saving{background:rgba(186,117,23,.15);border:1px solid rgba(186,117,23,.3);color:#BA7517}
.save-ind.saved{background:rgba(29,158,117,.12);border:1px solid rgba(29,158,117,.25);color:#1D9E75}
.save-ind.loading{background:rgba(74,159,212,.12);border:1px solid rgba(74,159,212,.25);color:#4a9fd4}
`;

// ==============================================================================
// HELPERS
// ==============================================================================
const fi  = n => Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
const f1  = n => Number(n||0).toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:1});
const f2  = n => Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct = (a,b) => b>0?Math.round((a/b)*100):0;
const scCls = s => s>=80?"hot":s>=65?"warm":"cold";
const scLbl = s => s+"pts";
const margenColor = m => m>=22?C.teal:m>=12?C.amber:C.red;
const fmtFecha = d => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});
};
const TC = 3.72;

// Genera iniciales desde nombre completo
const initials = nombre => nombre.split(" ").map(p=>p[0]).join("").substring(0,2).toUpperCase();

// Colores de avatar por defecto
const AVATAR_COLORS = [C.navy, C.blue, C.teal, C.amber, C.purple, C.red, "#059669","#d97706"];

// ==============================================================================
// DESCARGA DE PDF — genera un PDF básico con datos del proyecto
// ==============================================================================
function descargarPDF(nombre, contenido) {
  const fecha = new Date().toLocaleDateString("es-PE");
  const texto = contenido || "Nexova CRM Pro\n\nDocumento: "+nombre+"\nFecha: "+fecha+"\n\nGenerado por Nexova CRM Pro";
  const lineas = texto.split("\n");
  const rows = lineas.map(l => {
    const t = l.trim();
    if (!t) return '<tr><td colspan="2" style="height:8px"></td></tr>';
    if (t === t.toUpperCase() && t.length > 4 && !t.includes(":"))
      return '<tr><td colspan="2" style="padding:10px 0 4px;font-size:13px;font-weight:800;color:#0d2a4e;letter-spacing:.5px;border-bottom:2px solid #4a9fd4">'+t+'</td></tr>';
    const parts = t.split(/:\s+(.+)/);
    if (parts.length >= 2)
      return '<tr><td style="padding:4px 16px 4px 0;font-size:12px;color:#64748b;white-space:nowrap;font-weight:600;width:180px">'+parts[0]+'</td><td style="padding:4px 0;font-size:12px;color:#1e293b;font-weight:500">'+parts[1]+'</td></tr>';
    return '<tr><td colspan="2" style="padding:3px 0;font-size:12px;color:#1e293b">'+t+'</td></tr>';
  }).join("");
  const nombreLimpio = nombre.replace(/_/g," ");
  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>'+nombre+'</title>'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Segoe UI,system-ui,sans-serif;background:#f8fafc;display:flex;justify-content:center;padding:32px}'
    +'.page{background:#fff;width:760px;padding:40px 48px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.08)}'
    +'.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0d2a4e;padding-bottom:18px;margin-bottom:24px}'
    +'.logo{display:flex;align-items:center;gap:12px}.logo-sq{width:42px;height:42px;background:#0F766E;border-radius:8px;display:flex;align-items:center;justify-content:center}'
    +'.co{font-size:18px;font-weight:800;color:#0d2a4e}.sub{font-size:11px;color:#64748b;margin-top:2px}'
    +'.meta{text-align:right;font-size:11px;color:#64748b}table{width:100%;border-collapse:collapse}'
    +'.btn-print{margin:20px auto 0;display:block;padding:10px 28px;background:#0d2a4e;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}'
    +'.ft{margin-top:32px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}'
    +'@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;width:100%}.btn-print{display:none}}'
    +'</style></head><body><div class="page">'
    +'<div class="hdr"><div class="logo">'
    +'<div class="logo-sq"><svg width="28" height="28" viewBox="0 0 100 100" fill="none"><polygon points="50,8 84,27 84,68 50,87 16,68 16,27" fill="none" stroke="white" stroke-width="2.5"/><circle cx="50" cy="8" r="5" fill="white"/><circle cx="84" cy="27" r="5" fill="white"/><circle cx="84" cy="68" r="5" fill="white"/><circle cx="50" cy="87" r="5" fill="white"/><circle cx="16" cy="68" r="5" fill="white"/><circle cx="16" cy="27" r="5" fill="white"/><line x1="34" y1="67" x2="34" y2="31" stroke="white" stroke-width="4" stroke-linecap="square"/><line x1="34" y1="31" x2="66" y2="67" stroke="white" stroke-width="4" stroke-linecap="square"/><line x1="66" y1="31" x2="66" y2="67" stroke="white" stroke-width="4" stroke-linecap="square"/></svg></div>'
    +'<div><div class="co">NEXOVA</div><div class="sub">Servicios de Consultoría · Lima, Perú</div></div></div>'
    +'<div class="meta"><div style="font-size:12px;font-weight:700;color:#0d2a4e">'+nombreLimpio+'</div><div>Fecha: '+fecha+'</div><div>Nexova CRM Pro</div></div></div>'
    +'<table>'+rows+'</table>'
    +'<button class="btn-print" onclick="window.print()">Imprimir / Guardar PDF</button>'
    +'<div class="ft"><span>Desarrollado por <strong>Wilmer Moreno V.</strong> · NEXOVA · nexova.pe</span><span>'+fecha+'</span></div>'
    +'</div></body></html>';
  try {
    const blob2=new Blob([html],{type:"text/html;charset=utf-8"});
    const url2=URL.createObjectURL(blob2);
    const a2=document.createElement("a");
    a2.href=url2;a2.download=nombre.replace(/[^a-zA-Z0-9-_]/g,"_")+".html";
    document.body.appendChild(a2);a2.click();document.body.removeChild(a2);
    setTimeout(()=>URL.revokeObjectURL(url2),1000);
  } catch(edf) {
    const ventana=window.open("", "_blank");
    if(ventana){ventana.document.write(html);ventana.document.close();}
  }
}
function descargarExcel(nombre, cols, filas) {
  // SpreadsheetML — formato XML nativo de Excel, sin dependencias externas
  // Excel lo abre como hoja de cálculo real con columnas separadas
  const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const isNum = v => v!==null && v!=="" && !isNaN(parseFloat(v)) && isFinite(v);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel">\n';
  xml += '<Styles>\n';
  xml += ' <Style ss:ID="1"><Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="11"/><Interior ss:Color="#1E293B" ss:Pattern="Solid"/><Alignment ss:WrapText="0"/></Style>\n';
  xml += ' <Style ss:ID="2"><Interior ss:Color="#f1f5f9" ss:Pattern="Solid"/></Style>\n';
  xml += ' <Style ss:ID="3"><Font ss:Bold="1"/></Style>\n';
  xml += '</Styles>\n';
  xml += '<Worksheet ss:Name="'+esc(nombre.substring(0,31))+'">\n';
  xml += '<Table>\n';

  // Ancho de columnas
  cols.forEach(c => {
    const maxW = Math.max(c.length, ...filas.map(r=>{const v=Array.isArray(r)?r[cols.indexOf(c)]:Object.values(r)[cols.indexOf(c)];return String(v||"").length;}));
    xml += '<Column ss:Width="'+Math.min(Math.max(maxW*7.5,60),250)+'"/>\n';
  });

  // Fila cabecera
  xml += '<Row>\n';
  cols.forEach(c => {
    xml += ' <Cell ss:StyleID="1"><Data ss:Type="String">'+esc(c)+'</Data></Cell>\n';
  });
  xml += '</Row>\n';

  // Filas de datos
  filas.forEach((row, ri) => {
    const cells = Array.isArray(row) ? row : Object.values(row);
    xml += '<Row'+(ri%2===1?' ss:StyleID="2"':'')+'>\n';
    cells.forEach(v => {
      const tipo = isNum(v) ? 'Number' : 'String';
      const val  = isNum(v) ? parseFloat(v) : esc(v);
      xml += ' <Cell><Data ss:Type="'+tipo+'">'+val+'</Data></Cell>\n';
    });
    xml += '</Row>\n';
  });

  xml += '</Table>\n</Worksheet>\n</Workbook>';

  const blob = new Blob([xml], {type: 'application/vnd.ms-excel;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = nombre.replace(/[^a-zA-Z0-9_-]/g,'_')+'.xls';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}




// Función central para generar PDFs profesionales con gráficas SVG
function generarPDFRico(config) {
  const {nombre,titulo,subtitulo,kpis=[],secciones=[],analisis={}}=config;
  const fecha=new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});
  const IL=typeof IMG_LOGO!=="undefined"?IMG_LOGO:"";
  const css=`
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:"Segoe UI",sans-serif;background:#e8edf2;padding:24px;color:#1e293b}
    .page{background:#fff;max-width:840px;margin:0 auto 24px;border-radius:10px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.12);page-break-after:always}
    .page:last-child{page-break-after:avoid}
    .hdr{background:linear-gradient(135deg,#1D9E75 0%,#1a2e4a 100%);padding:24px 36px;display:flex;justify-content:space-between;align-items:center}
    .lw{display:flex;align-items:center;gap:14px}
    .sq{width:44px;height:44px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .co{color:#fff;font-size:18px;font-weight:800;letter-spacing:.5px}
    .sub{color:rgba(255,255,255,.6);font-size:10px;margin-top:3px}
    .hr{text-align:right;color:rgba(255,255,255,.55);font-size:11px;line-height:2}
    .hr strong{color:#fff;font-size:14px;display:block}
    .band{background:#1D9E75;padding:8px 36px;display:flex;justify-content:space-between;align-items:center}
    .bt{color:#fff;font-size:13px;font-weight:800}
    .bs{color:rgba(255,255,255,.75);font-size:11px}
    .body{padding:24px 36px}
    .krow{display:grid;gap:10px;margin-bottom:18px}
    .kc{background:#f0fdf9;border:1px solid #a7f3d0;border-radius:10px;padding:14px;text-align:center}
    .kl{font-size:9px;font-weight:700;text-transform:uppercase;color:#64748b;margin-bottom:4px;letter-spacing:.5px}
    .kv{font-size:18px;font-weight:800;font-family:monospace}
    .sec{margin-bottom:22px;page-break-inside:avoid}
    .sh{font-size:11px;font-weight:800;color:#1D9E75;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #1D9E75;padding-bottom:6px;margin-bottom:12px}
    .ab{background:#f0fdf9;border-left:4px solid #1D9E75;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:10px}
    .at{font-size:10px;font-weight:800;color:#1D9E75;text-transform:uppercase;margin-bottom:5px}
    .ax{font-size:11px;color:#1e293b;line-height:1.8}
    .rka{background:#fef2f2;border-left:4px solid #E24B4A;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:10px}
    .rkt{font-size:10px;font-weight:800;color:#991b1b;text-transform:uppercase;margin-bottom:5px}
    .rkg{background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:10px}
    .rkgt{font-size:10px;font-weight:800;color:#166534;text-transform:uppercase;margin-bottom:5px}
    .rkp{background:#f8f0ff;border-left:4px solid #7c3aed;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:10px}
    .rkpt{font-size:10px;font-weight:800;color:#5b21b6;text-transform:uppercase;margin-bottom:5px}
    .rx{font-size:11px;color:#475569;line-height:1.7}
    .tbl{width:100%;border-collapse:collapse;font-size:11px;page-break-inside:avoid}
    .tbl th{background:#1a2e4a;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.3px}
    .tbl td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top}
    .tbl tr:nth-child(even) td{background:#f8fafc}
    .tbl tr:last-child td{border-bottom:none}
    .tbl-wrap{page-break-inside:avoid;overflow:hidden}
    .pg-break{page-break-before:always;height:0}
    .ft{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
    .ft strong{color:#1a2e4a}
    svg{max-width:100%;height:auto}
    @media print{
      body{background:#fff;padding:0}
      .page{box-shadow:none;max-width:100%;margin:0;border-radius:0;page-break-after:always}
      .page:last-child{page-break-after:avoid}
      .np{display:none}
      .tbl{page-break-inside:avoid}
      .sec{page-break-inside:avoid}
      tr{page-break-inside:avoid}
    }
  `;

  // -- Helpers (concatenación, sin template literals)
  const logoSVG='<svg width="30" height="30" viewBox="0 0 80 80" fill="none"><polygon points="40,4 68,20 68,56 40,72 12,56 12,20" fill="none" stroke="white" stroke-width="2"/><line x1="28" y1="56" x2="28" y2="26" stroke="white" stroke-width="3" stroke-linecap="round"/><line x1="28" y1="26" x2="52" y2="56" stroke="white" stroke-width="3" stroke-linecap="round"/><line x1="52" y1="26" x2="52" y2="56" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>';
  const logoImg = IL ? '<img src="'+IL+'" style="width:100%;height:100%;object-fit:contain"/>' : logoSVG;
  const mkHdr = function(tit,sub) {
    return '<div class="hdr">'
      +'<div class="lw"><div class="sq">'+logoImg+'</div>'
      +'<div><div class="co">NEXOVA CRM</div><div class="sub">Aquarius Consulting S.A.C. - Lima, Peru</div></div></div>'
      +'<div class="hr"><strong>'+tit.toUpperCase()+'</strong>'+fecha+'<br/>Nexova CRM Pro v3.0</div>'
      +'</div>'
      +'<div class="band"><div class="bt">'+tit+'</div><div class="bs">'+(sub||"")+'</div></div>';
  };
  const mkFt = function() {
    return '<div class="ft"><span>Desarrollado por <strong>Wilmer Moreno V.</strong> - Aquarius Consulting S.A.C.</span><span>Nexova CRM Pro v3.0 - '+fecha+'</span></div>';
  };
  // -- Página 1: KPIs + secciones principales
  let pages = [];
  let pg1 = '<div class="body">';
  if(kpis.length){
    const cols=Math.min(kpis.length,4);
    pg1+='<div class="sec"><div class="sh">Indicadores Clave</div><div class="krow" style="grid-template-columns:repeat('+cols+',1fr)">';
    kpis.forEach(k=>{pg1+='<div class="kc"><div class="kl">'+k.label+'</div><div class="kv" style="color:'+(k.color||"#1D9E75")+'">'+k.value+'</div></div>';});
    pg1+='</div></div>';
  }
  // Secciones en página 1 (máx 2)
  const secc1 = secciones.slice(0,2);
  secc1.forEach(s=>{pg1+='<div class="sec"><div class="sh">'+s.titulo+'</div><div class="tbl-wrap">'+s.contenido+'</div></div>';});
  pg1+=mkFt()+'</div>';
  pages.push(mkHdr(titulo,subtitulo)+pg1);

  // -- Página 2: resto de secciones (si hay más de 2)
  if(secciones.length>2){
    let pg2='<div class="body">';
    secciones.slice(2).forEach(s=>{pg2+='<div class="sec"><div class="sh">'+s.titulo+'</div><div class="tbl-wrap">'+s.contenido+'</div></div>';});
    pg2+=mkFt()+'</div>';
    pages.push(mkHdr(titulo,subtitulo+' (continuación)')+pg2);
  }

  // -- Página final: Análisis y recomendaciones
  if(analisis.situacion||analisis.riesgos||analisis.logros||analisis.recomendaciones){
    let pg3='<div class="body"><div class="sec"><div class="sh">Análisis, Conclusiones y Recomendaciones</div>';
    if(analisis.situacion) pg3+='<div class="ab"><div class="at">Situación actual</div><div class="ax">'+analisis.situacion+'</div></div>';
    if(analisis.logros)    pg3+='<div class="rkg"><div class="rkgt">Aspectos positivos</div><div class="rx">'+analisis.logros+'</div></div>';
    if(analisis.riesgos)   pg3+='<div class="rka"><div class="rkt">Riesgos y atención</div><div class="rx">'+analisis.riesgos+'</div></div>';
    if(analisis.recomendaciones) pg3+='<div class="rkp"><div class="rkpt">Recomendaciones estratégicas</div><div class="rx">'+analisis.recomendaciones+'</div></div>';
    pg3+='</div>'+mkFt()+'</div>';
    pages.push(mkHdr(titulo,'Análisis Ejecutivo')+pg3);
  }

  // -- Generar HTML final
  const html='<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>'+titulo+'</title><style>'+css+'</style></head><body>'
    +pages.map(p=>'<div class="page">'+p+'</div>').join('')
    +'<div style="text-align:center;margin:24px 0" class="np"><button onclick="window.print()" style="padding:12px 40px;background:#1D9E75;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(29,158,117,.3)">Imprimir / Guardar PDF</button><span style="display:block;margin-top:8px;font-size:11px;color:#94a3b8">'+pages.length+' páginas</span></div>'
    +'</body></html>';

  try {
    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=nombre.replace(/[^a-zA-Z0-9-_]/g,"_")+".html";
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(e2) {
    const win=window.open("","_blank");
    if(win){win.document.write(html);win.document.close();}
  }
}


const I = {
  dash:   <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  crm:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  prf:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  res:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  exe:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  bdg:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  rpt:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  cfg:    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  bell:   <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>,
  sun:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>,
  moon:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  chL:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"/></svg>,
  chR:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>,
  plus:   <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check:  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20,6 9,17 4,12"/></svg>,
  trash:  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  dl:     <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  eye:    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  logout: <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  lock:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  mail:   <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  link:   <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  shield: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  srch:   <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  zap:    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>,
  upload: <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  save:   <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/></svg>,
  reset:  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>,
  file:   <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  x:      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  usr:    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  upload: "↑",
  upload:"↑",
};

// ==============================================================================
// LOGO
// ==============================================================================
const Logo = ({s=26, bg=false}) => (
  <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
    {bg && <rect width="100" height="100" rx="14" fill="#0F766E"/>}
    <polygon points="50,8 84,27 84,68 50,87 16,68 16,27"
      fill="none" stroke={bg?"white":"#0D9488"} strokeWidth="2.5"/>
    <circle cx="50" cy="8"  r="5" fill={bg?"white":"#0D9488"}/>
    <circle cx="84" cy="27" r="5" fill={bg?"white":"#0D9488"}/>
    <circle cx="84" cy="68" r="5" fill={bg?"white":"#0D9488"}/>
    <circle cx="50" cy="87" r="5" fill={bg?"white":"#0D9488"}/>
    <circle cx="16" cy="68" r="5" fill={bg?"white":"#0D9488"}/>
    <circle cx="16" cy="27" r="5" fill={bg?"white":"#0D9488"}/>
    <line x1="34" y1="67" x2="34" y2="31" stroke={bg?"white":"#0D9488"} strokeWidth="4" strokeLinecap="square"/>
    <line x1="34" y1="31" x2="66" y2="67" stroke={bg?"white":"#0D9488"} strokeWidth="4" strokeLinecap="square"/>
    <line x1="66" y1="31" x2="66" y2="67" stroke={bg?"white":"#0D9488"} strokeWidth="4" strokeLinecap="square"/>
  </svg>
)

// ==============================================================================
// TOAST
// ==============================================================================
let tid = 0;
function useToast() {
  const [ts, setTs] = useState([]);
  const show = useCallback((msg, type="info") => {
    const id = ++tid;
    setTs(t => [...t, {id, msg, type}]);
    setTimeout(() => setTs(t => t.filter(x => x.id!==id)), 3200);
  }, []);
  return {ts, show};
}

function SaveIndicator({status}) {
  if (!status) return null;
  const cfg = {
    loading:{icon:"⏳",lbl:"Cargando datos…",cls:"loading"},
    saving: {icon:"💾",lbl:"Guardando…",     cls:"saving"},
    saved:  {icon:"✓", lbl:"Datos guardados",cls:"saved"},
  };
  const c = cfg[status];
  if (!c) return null;
  return <div className={`save-ind ${c.cls}`}><span>{c.icon}</span>{c.lbl}</div>;
}

// ==============================================================================
// COMPONENTES COMPARTIDOS
// ==============================================================================
function CTip({active,payload,label,pre="",suf=""}) {
  if (!active||!payload||payload.length===0) return null;
  return (
    <div style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:6,padding:"8px 12px",fontSize:12}}>
      <div style={{color:"var(--t3)",marginBottom:3,fontSize:11}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color||"var(--t1)",fontWeight:600}}>
          {p.name}: {pre}{typeof p.value==="number"?fi(p.value):p.value}{suf}
        </div>
      ))}
    </div>
  );
}

function PBar({pct:p,color,height=6}) {
  const bg = color||(p>=80?C.teal:p>=50?C.amber:C.blue);
  return (
    <div style={{height,background:"var(--bd)",borderRadius:height/2,overflow:"hidden"}}>
      <div style={{height,borderRadius:height/2,width:Math.min(p,100)+"%",background:bg,transition:"width .5s"}}/>
    </div>
  );
}

function ScoreRing({score}) {
  const col=score>=80?C.teal:score>=60?C.amber:C.red;
  const r=24,cir=2*Math.PI*r,fill=(score/100)*cir;
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
      <svg width="62" height="62" style={{transform:"rotate(-90deg)"}}>
        <circle cx="31" cy="31" r={r} fill="none" stroke="var(--bd)" strokeWidth="5"/>
        <circle cx="31" cy="31" r={r} fill="none" stroke={col} strokeWidth="5" strokeDasharray={`${fill} ${cir}`} strokeLinecap="round"/>
      </svg>
      <div style={{position:"absolute",textAlign:"center"}}>
        <div style={{fontSize:14,fontWeight:800,color:col,fontFamily:"var(--mono)"}}>{score}</div>
        <div style={{fontSize:9,color:"var(--t3)",marginTop:-1}}>SCORE</div>
      </div>
    </div>
  );
}

function Tabs({tabs,active,onChange}) {
  return (
    <div className="tab-bar">
      {tabs.map(t=>(
        <div key={t.id} className={`tab-item${active===t.id?" act":""}`}
          style={t.highlight?{position:"relative"}:{}}
          onClick={()=>onChange(t.id)}>
          {t.lbl}
          {t.highlight&&(
            <span style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:16,height:16,borderRadius:"50%",
              background:"#0D9488",color:"#fff",
              fontSize:8,fontWeight:900,
              marginLeft:5,verticalAlign:"middle",
              boxShadow:"0 0 0 3px rgba(13,148,136,.25)",
              animation:"update-pulse 2s ease infinite"
            }}>{t.highlight}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ==============================================================================
// MOTOR DE ALERTAS
// ==============================================================================
function generarAlertas(proyectos, leads) {
  const alertas = [];
  const HOY = new Date();
  proyectos.forEach(p => {
    p.fases.forEach(f => f.ents.forEach(e => {
      if (e.est==="entregado") return;
      const d = Math.ceil((new Date(e.fecha)-HOY)/(1000*60*60*24));
      if (d<0)       alertas.push({lv:"critical",tx:`${p.cliente} — "${e.nom}" vencido hace ${Math.abs(d)}d.`,tm:`F${f.id}`,tag:"Entregable"});
      else if (d<=3) alertas.push({lv:"warning", tx:`${p.cliente} — "${e.nom}" vence en ${d} día(s).`,        tm:`${d}d`,  tag:"Entregable"});
    }));
    p.cobros.filter(c=>c.estado!=="cobrado").forEach(c=>{
      const d=Math.ceil((new Date(c.fecha)-HOY)/(1000*60*60*24));
      if (d<0)       alertas.push({lv:"critical",tx:`${p.cliente} — Cuota ${c.n} ($${fi(c.monto)}) vencida hace ${Math.abs(d)}d.`,tm:"Vencida",tag:"Cobro"});
      else if (d<=7) alertas.push({lv:"warning", tx:`${p.cliente} — Cuota ${c.n} ($${fi(c.monto)}) vence en ${d}d.`,            tm:`${d}d`,  tag:"Cobro"});
    });
    const pctH=pct(p.horasReal,p.horasCot);
    if (pctH>=95) alertas.push({lv:"critical",tx:`${p.cliente} — Horas al ${pctH}%. Riesgo sobrecosto.`,tm:"Ahora",tag:"Horas"});
    else if (pctH>=80) alertas.push({lv:"warning",tx:`${p.cliente} — Horas al ${pctH}%. Monitorear.`,tm:"Ahora",tag:"Horas"});
    if (p.margen<12) alertas.push({lv:"critical",tx:`${p.cliente} — Margen ${p.margen}%. Bajo mínimo 12%.`,tm:"Ahora",tag:"Margen"});
    const dFin=Math.ceil((new Date(p.fin)-HOY)/(1000*60*60*24));
    if (dFin<=14&&p.avance<70) alertas.push({lv:"critical",tx:`${p.cliente} — Cierra en ${dFin}d con ${p.avance}% avance.`,tm:`${dFin}d`,tag:"Plazo"});
  });
  const allLeads=Object.values(leads).flat();
  allLeads.filter(l=>l.stage!=="ganado").forEach(l=>{
    const d=Math.ceil((HOY-new Date(l.last))/(1000*60*60*24));
    if (d>=7)      alertas.push({lv:"critical",tx:`${l.co} — sin actividad ${d} días. Riesgo de pérdida.`,  tm:`${d}d`,tag:"CRM"});
    else if (d>=3) alertas.push({lv:"warning", tx:`${l.co} — sin actividad ${d} días. Programar seguimiento.`,tm:`${d}d`,tag:"CRM"});
  });
  alertas.push({lv:"success",tx:"SIMSA — Cuota 1 cobrada exitosamente USD 6,625.",tm:"30 Mar",tag:"Cobro"});
  alertas.push({lv:"success",tx:"Poderosa — Cuotas 1 y 2 cobradas. USD 9,100.",  tm:"29 Mar",tag:"Cobro"});
  return alertas;
}

// ==============================================================================
// LOGIN
// ==============================================================================
function LoginScreen({onLogin, usuariosDB}) {
  const [email,setEmail]     = useState("");
  const [pass,setPass]       = useState("");
  const [showP,setShowP]     = useState(false);
  const [error,setError]     = useState("");
  const [loading,setLoading] = useState(false);
  const [showPassDemo,setShowPassDemo] = useState({});

  const ROL_COLOR = {
    Admin:"#e74c3c", Comercial:"#27ae60", Gerencia:"#8e44ad",
    "Jefe Proyecto":"#2980b9", Consultor:"#16a085", Operaciones:"#e67e22", RRHH:"#c0392b",
  };

  const intentar = () => {
    setError("");
    if (!email||!pass) { setError("Ingresa tu email y contraseña."); return; }
    setLoading(true);
    setTimeout(()=>{
      const u=usuariosDB.find(x=>x.email.toLowerCase()===email.toLowerCase()&&x.password===pass);
      if (!u)        { setError("Credenciales incorrectas. Verifica tu email y contraseña.");  setLoading(false); return; }
      if (!u.activo) { setError("Cuenta desactivada. Contacta al administrador del sistema."); setLoading(false); return; }
      onLogin(u);
    },700);
  };

  const seleccionarDemo = (u) => { setEmail(u.email); setPass(u.password); setError(""); };

  return (
    <div style={{minHeight:"100vh",display:"flex",background:"#0d1825",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>

      {/* -- PANEL IZQUIERDO — Branding -- */}
      <div style={{width:"45%",minHeight:"100vh",background:"linear-gradient(160deg,#0F766E 0%,#1E293B 55%,#0a1a1a 100%)",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"48px 44px",position:"relative",overflow:"hidden",flexShrink:0}}>
        {/* Grid de fondo */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(74,159,212,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(74,159,212,.05) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none"}}/>
        {/* Círculo decorativo */}
        <div style={{position:"absolute",bottom:-120,left:-80,width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(15,118,110,.15) 0%,transparent 70%)",pointerEvents:"none"}}/>

        {/* Logo + nombre */}
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Logo s={52} bg={true}/>
            </div>
            <div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:900,color:"#fff",letterSpacing:2}}>NEXOVA</div>
              
            </div>
          </div>
          <div style={{width:40,height:2,background:"rgba(74,159,212,.4)",borderRadius:2,marginBottom:32}}/>
          <div style={{fontSize:28,fontWeight:800,color:"#fff",lineHeight:1.25,marginBottom:12}}>
            Deje de administrar caos.<br/>
            <span style={{color:"#0D9488"}}>Empiece a dirigir resultados.</span>
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.45)",lineHeight:1.7,maxWidth:300}}>
            Plataforma integral para gestión comercial, ejecución y control de proyectos y facturación y cobranzas.
          </div>
        </div>

        {/* Métricas */}
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:24}}>
            {[
              {v:"100+", l:"Empresas atendidas"},
              {v:"NIIF", l:"13 · 16 · RNT · IVSC"},
              {v:"7",    l:"Roles de usuario"},
              {v:"SaaS", l:"nexova.pe"},
            ].map((m,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,padding:"12px 14px"}}>
                <div style={{fontSize:20,fontWeight:900,color:"#4a9fd4",marginBottom:2}}>{m.v}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.32)",textTransform:"uppercase",letterSpacing:.8}}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.2)",letterSpacing:.5}}>
            Desarrollado por <span style={{color:"rgba(13,148,136,.8)",fontWeight:700}}>NEXOVA</span> — Wilmer Moreno V. · nexova.pe
          </div>
        </div>
      </div>

      {/* -- PANEL DERECHO — Login + Demo -- */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 40px",overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:480}}>

          {/* Título */}
          <div style={{marginBottom:28,textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:4}}>Bienvenido</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.35)"}}>Ingresa tus credenciales para acceder al sistema</div>
          </div>

          {/* Form */}
          <div style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(15,118,110,.2)",borderRadius:12,padding:"28px 28px 24px",backdropFilter:"blur(12px)",marginBottom:16}}>
            {error&&<div className="l-err"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}

            <label style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:.8,color:"rgba(255,255,255,.4)",marginBottom:6,display:"block"}}>Correo electrónico</label>
            <div style={{position:"relative",marginBottom:14}}>
              <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",pointerEvents:"none"}}>{I.mail}</div>
              <input className="l-input" style={{margin:0}} type="email" placeholder="usuario@aquariusconsulting.com.pe" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&intentar()}/>
            </div>

            <label style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:.8,color:"rgba(255,255,255,.4)",marginBottom:6,display:"block"}}>Contraseña</label>
            <div style={{position:"relative",marginBottom:20}}>
              <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.3)",pointerEvents:"none"}}>{I.lock}</div>
              <input className="l-input" style={{margin:0,paddingRight:40}} type={showP?"text":"password"} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&intentar()}/>
              <button onClick={()=>setShowP(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,.35)",background:"none",border:"none",cursor:"pointer",padding:4}}>{showP?I.eyeOff:I.eye}</button>
            </div>

            <button className="l-btn" onClick={intentar} disabled={loading}>
              {loading
                ? <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>Verificando…</span>
                : "Ingresar al Sistema →"}
            </button>

            <div style={{marginTop:10,textAlign:"center"}}>
              <button onClick={async()=>{
                if(window.confirm("¿Limpiar todos los datos guardados y reiniciar? Esto borrará datos locales pero NO afecta el servidor.")){
                  try{
                    const keys=["proyectos","leads","cotizaciones","usuarios","tarifas","sysConfig"];
                    for(const k of keys){
                      if(window.storage) await window.storage.delete("aq:"+k).catch(()=>{});
                      localStorage.removeItem("aq:"+k);
                    }
                    window.location.reload();
                  }catch(e){window.location.reload();}
                }
              }} style={{fontSize:10,color:"rgba(255,255,255,.2)",background:"transparent",border:"none",cursor:"pointer",textDecoration:"underline",padding:"2px 6px"}}>
                Problemas al cargar — Limpiar datos y reiniciar
              </button>
            </div>
            <div style={{marginTop:8,fontSize:11,color:"rgba(255,255,255,.25)",textAlign:"center",lineHeight:1.6}}>
              <span style={{color:"rgba(74,159,212,.6)",fontWeight:600}}>¿Sin acceso?</span> Contacta a <strong style={{color:"rgba(255,255,255,.4)"}}>Wilmer Moreno</strong> — <span style={{fontFamily:"monospace",fontSize:10}}>wilmer@nexova.pe</span>
            </div>
          </div>

          {/* Panel acceso rápido */}
          <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(74,159,212,.15)",borderRadius:12,padding:"16px 20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"rgba(74,159,212,.7)"}}>⚡ Acceso rápido — Demo</div>
              <span style={{fontSize:9,padding:"2px 7px",borderRadius:8,background:"rgba(186,117,23,.2)",color:"#BA7517",fontWeight:700,border:"1px solid rgba(186,117,23,.3)"}}>SOLO PRUEBAS</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {usuariosDB.filter(u=>u.activo).map(u=>(
                <div key={u.id} style={{borderRadius:8,border:`1px solid ${email===u.email?"rgba(74,159,212,.4)":"rgba(255,255,255,.06)"}`,overflow:"hidden",transition:"border-color .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:email===u.email?"rgba(74,159,212,.08)":"transparent"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:u.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:email===u.email?"#4a9fd4":"rgba(255,255,255,.8)",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.nombre}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,.25)",fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                    </div>
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:8,background:(ROL_COLOR[u.rol]||"#4a9fd4")+"22",color:ROL_COLOR[u.rol]||"#4a9fd4",border:`1px solid ${(ROL_COLOR[u.rol]||"#4a9fd4")}35`,flexShrink:0}}>{u.rol}</span>
                    <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                      <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,.5)",letterSpacing:showPassDemo[u.id]?.3:1.5,minWidth:60}}>
                        {showPassDemo[u.id] ? u.password : "•".repeat(Math.min(u.password.length,8))}
                      </span>
                      <button onClick={e=>{e.stopPropagation();setShowPassDemo(p=>({...p,[u.id]:!p[u.id]}));}} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.25)",padding:2,display:"flex"}}>{showPassDemo[u.id]?I.eyeOff:I.eye}</button>
                      <button onClick={()=>seleccionarDemo(u)} style={{background:"rgba(74,159,212,.18)",border:"1px solid rgba(74,159,212,.3)",color:"#4a9fd4",borderRadius:4,padding:"3px 10px",fontSize:9,fontWeight:700,cursor:"pointer"}}>Usar →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// SPLASH
// ==============================================================================
function SplashWelcome({usuario}) {
  return (
    <div className="splash">
      <div style={{textAlign:"center",animation:"splashIn .4s ease"}}>
        <Logo s={72} bg={true}/>
        <div style={{marginTop:18,fontFamily:"'Sora',sans-serif",fontSize:26,fontWeight:800,color:"#fff",letterSpacing:2}}>NEXOVA</div>
        <div style={{fontSize:11,color:"rgba(13,148,136,.8)",letterSpacing:3,textTransform:"uppercase",marginTop:2,marginBottom:16}}>SOFTWARE EMPRESARIAL</div>
        <div style={{width:40,height:1,background:"rgba(13,148,136,.4)",margin:"0 auto 16px"}}/>
        <div style={{fontSize:15,color:"rgba(255,255,255,.9)",fontWeight:600}}>Bienvenido, {usuario.nombre.split(" ")[0]}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4}}>{usuario.rol}</div>
        <div style={{marginTop:24,display:"flex",gap:6,justifyContent:"center"}}>
          {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"rgba(13,148,136,.35)",animation:`dot ${.7+i*.2}s ease-in-out infinite alternate`}}/>)}
        </div>
        <div style={{marginTop:28,padding:"12px 24px",background:"rgba(15,118,110,.2)",borderRadius:10,border:"1px solid rgba(13,148,136,.3)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:4,letterSpacing:1,textTransform:"uppercase"}}>Desarrollado por</div>
          <div style={{fontSize:16,fontWeight:800,color:"#fff",fontFamily:"'Sora',sans-serif",letterSpacing:1}}>Wilmer Moreno V.</div>
          <div style={{fontSize:11,color:"rgba(13,148,136,.9)",marginTop:2}}>nexova.pe · +51 949 287 897</div>
        </div>
        <style>{`@keyframes splashIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes dot{to{background:rgba(13,148,136,1)}}`}</style>
      </div>
    </div>
  );
}

// ==============================================================================
// SIDEBAR  — NOTA: "Dashboard", "CRM", "Pipeline" NO se traducen
// ==============================================================================
const NAV_ALL = [
  // -- PRINCIPAL ------------------------------
  {id:"dashboard",      lbl:"Dashboard",      icon:"dash",   badge:null,  grupo:"Principal"},
  // -- COMERCIAL ------------------------------
  {id:"crm",            lbl:"CRM Pipeline",   icon:"crm",    badge:null,  grupo:"Comercial"},
  {id:"rentabilidad",   lbl:"Cotizaciones",    icon:"prf",    badge:null,  grupo:"Comercial"},
  // propuestas fusionado con rentabilidad
  {id:"importleads",    lbl:"Importar Leads",  icon:"usr",    badge:null,  grupo:"Comercial"},
  // -- OPERACIONES ----------------------------
  {id:"ejecucion",      lbl:"Ejecución",       icon:"exe",    badge:null,  grupo:"Operaciones"},
  {id:"calidad",        lbl:"Control Calidad", icon:"shield", badge:null,  grupo:"Operaciones"},
  {id:"inventario",     lbl:"Carga Inventario",icon:"file",   badge:null,  grupo:"Operaciones"},
  {id:"recursos",       lbl:"Recursos",        icon:"res",    badge:null,  grupo:"Operaciones"},
  // -- FINANZAS -------------------------------
  {id:"facturacion",    lbl:"Facturación",     icon:"prf",    badge:null,  grupo:"Finanzas"},
  {id:"presupuesto",    lbl:"Presupuesto",     icon:"bdg",    badge:null,  grupo:"Finanzas"},
  {id:"reportes",       lbl:"Reportes",        icon:"rpt",    badge:null,  grupo:"Finanzas"},
  // -- ADMINISTRACIÓN -------------------------
  {id:"rrhh",           lbl:"RRHH",            icon:"usr",    badge:null,  grupo:"Administración"},
  {id:"notificaciones", lbl:"Notificaciones",  icon:"zap",    badge:null,  grupo:"Administración"},
  {id:"integraciones",  lbl:"Integraciones",   icon:"link",   badge:null,  grupo:"Administración"},
  {id:"config",         lbl:"Configuración",   icon:"cfg",    badge:null,  grupo:"Administración"},
  {id:"manual",         lbl:"Manual",           icon:"doc",    badge:null,  grupo:"Administración"},
];

function Sidebar({active,onNav,col,onToggle,usuario,alertasCrit,highlights={}}) {

  const acceso = ACCESO_ROL[usuario.rol]||[];
  const items  = NAV_ALL.filter(n=>acceso.includes(n.id));
  const grupos = ["Principal","Comercial","Operaciones","Finanzas","Administración"];
  const gColor = {Principal:"#0D9488",Comercial:"#0F766E",Operaciones:"#D97706",Finanzas:"#7c3aed",Administración:"#64748b"};

  return (
    <nav className={`sb${col?" col":""}`}>
      <div className="sb-logo">
        <Logo s={36} bg={true}/>
        {!col&&<div className="sb-lt">
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,letterSpacing:2,color:"#fff"}}>NEXOVA</div>
        </div>}
      </div>
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",paddingBottom:8}}>
        {grupos.map(grupo=>{
          const gItems = items.filter(n=>n.grupo===grupo);
          if(gItems.length===0) return null;
          const lc = gColor[grupo]||"#4a9fd4";
          return (
            <div key={grupo}>
              {!col&&<div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:2,color:"rgba(255,255,255,.35)",padding:"14px 18px 4px",borderTop:grupo!=="Principal"?"1px solid rgba(255,255,255,.06)":"none",marginTop:grupo!=="Principal"?4:0,display:"flex",alignItems:"center",gap:6}}>
                <span style={{flex:1,height:"1px",background:"rgba(255,255,255,.07)",display:"inline-block",maxWidth:8}}/>
                {grupo}
              </div>}
              {col&&grupo!=="Principal"&&<div style={{height:1,background:"rgba(255,255,255,.07)",margin:"4px 8px"}}/>}
              {gItems.map(n=>{
                const act = active===n.id;
                return (
                  <div key={n.id}
                    className={`sbi${act?" act":""}`}
                    onClick={()=>onNav(n.id)}
                    title={col?n.lbl:""}
                    style={{borderLeftColor:act?lc:"transparent"}}
                  >
                    {I[n.icon]||I.dash}
                    {!col&&<span className="sbi-l">{n.lbl}</span>}
                    {!col&&(highlights[n.id]||n.badge)>0&&(
                      <span className="sb-bdg" style={{
                        background:lc,
                        animation:"update-pulse 2s ease infinite"
                      }}>{highlights[n.id]||n.badge}</span>
                    )}
                    {n.id==="notificaciones"&&alertasCrit>0&&!col&&<span className="sb-bdg" style={{background:C.red}}>{alertasCrit}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,.08)",padding:"4px 0"}}>
        <div className="sbi" onClick={onToggle} title={col?"Expandir":"Colapsar"}>
          <span style={{display:"inline-flex",transform:col?"scaleX(-1)":"none",transition:"transform .25s"}}>{I.chv||I.cfg}</span>
          {!col&&<span className="sbi-l" style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>Colapsar menú</span>}
        </div>
      </div>
    </nav>
  );
}


const PAGE_META = {
  dashboard:     {title:"Dashboard Gerencial",        sub:"Vista ejecutiva consolidada"},
  importleads:   {title:"Importar Leads Históricos", sub:"Carga masiva al pipeline CRM · Plantilla descargable · Validación previa"},
  crm:           {title:"CRM — Pipeline Comercial",   sub:"Gestión de leads y oportunidades"},
  rentabilidad:  {title:"Cotizaciones",               sub:"Calculadora de rentabilidad y margen"},
  propuestas:    {title:"Propuestas Comerciales",     sub:"Pipeline de propuestas y memorándums"},
  ejecucion:     {title:"Módulo Ejecución",           sub:"Cronograma · entregables · horas · cobros"},
  inventario:    {title:"Carga de Inventario",      sub:"Carga masiva · KPIs automáticos · Detección inteligente de columnas"},
  calidad:       {title:"Control de Calidad",         sub:"Inventario físico · faltantes · sobrantes"},
  requerimientos:{title:"Requerimientos",             sub:"Personal · TI · EPP · viáticos · etiquetas"},
  recursos:      {title:"Módulo Recursos",            sub:"Solicitud y asignación de recursos en campo"},
  facturacion:   {title:"Facturación y Cobros",       sub:"Facturas emitidas · cobradas · pendientes"},
  presupuesto:   {title:"Control Presupuestal",       sub:"Real vs. cotizado · variaciones · alertas"},
  reportes:      {title:"Reportería Avanzada",        sub:"12 reportes · PDF · Excel · análisis IA"},
  rrhh:          {title:"RRHH — Gestión de Personal", sub:"Directorio · carga · evaluaciones"},
  notificaciones:{title:"Notificaciones y Alertas",   sub:"Motor de alertas en tiempo real"},
  integraciones: {title:"Integraciones Externas",     sub:"SUNAT · WhatsApp · Calendar · Excel"},
  config:        {title:"Configuración del Sistema",  sub:"Usuarios · roles · tarifas · parámetros"},
  manual:        {title:"Manual de Usuario",          sub:"Guía completa del sistema v3.0"},
};

function Header({page,dark,onDark,toast,usuario,onLogout,alertasCrit,onReset,notifs,onMarcarLeida,onNavNotif,tourActivo,onTourToggle}) {
  const meta=PAGE_META[page]||{title:page,sub:""};
  const [menu,setMenu]=useState(false);
  const [showNotif,setShowNotif]=useState(false);
  // A2 — cerrar notif al click fuera
  React.useEffect(()=>{
    if(!showNotif) return;
    const handler = ()=>setShowNotif(false);
    document.addEventListener("click", handler);
    return ()=>document.removeEventListener("click", handler);
  },[showNotif]);
  const noLeidas=(notifs||[]).filter(n=>!n.leida).length;
  const NOTIF_COL={critico:C.red,alerta:C.amber,info:C.blue,exito:C.teal};
  return (
    <header className="hdr" style={{position:"relative"}}>
      <div><div style={{fontSize:14,fontWeight:700,color:dark?"#4a9fd4":"#1E293B"}}>{meta.title}</div><div style={{fontSize:11,color:"var(--t3)"}}>{meta.sub}</div></div>
      <div style={{flex:1}}/>
      <span className="pill blue" style={{gap:4}}>{I.shield} {usuario.rol}</span>
      <button className="btn btn-s btn-sm" onClick={()=>toast("Buscando…","info")}>{I.srch} Buscar</button>

      {/* -- Campana con panel flotante -- */}
      <div style={{position:"relative"}}>
        <button className="btn btn-s btn-sm" style={{position:"relative"}} onClick={()=>{setShowNotif(s=>!s);setMenu(false);}}>
          {I.bell}
          {noLeidas>0&&<span style={{position:"absolute",top:2,right:2,minWidth:16,height:16,background:C.red,borderRadius:8,fontSize:9,fontWeight:700,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",lineHeight:1}}>{noLeidas}</span>}
        </button>
        {showNotif&&(
          <div style={{position:"absolute",right:0,top:42,width:340,background:"var(--card)",border:"1px solid var(--bd)",borderRadius:10,boxShadow:"0 12px 32px rgba(0,0,0,.15)",zIndex:200}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:13,fontWeight:700}}>Notificaciones {noLeidas>0&&<span className="pill red" style={{fontSize:10,marginLeft:4}}>{noLeidas} nuevas</span>}</div>
              {noLeidas>0&&<button style={{fontSize:11,color:C.blue,background:"none",border:"none",cursor:"pointer",fontWeight:600}} onClick={()=>(notifs||[]).forEach(n=>onMarcarLeida&&onMarcarLeida(n.id))}>Marcar todas</button>}
            </div>
            <div style={{maxHeight:320,overflowY:"auto"}}>
              {(notifs||[]).length===0
                ? <div style={{padding:24,textAlign:"center",color:"var(--t3)",fontSize:12}}>Sin notificaciones</div>
                : (notifs||[]).slice(0,10).map(n=>(
                  <div key={n.id} onClick={()=>{onMarcarLeida&&onMarcarLeida(n.id);if(n.modulo&&onNavNotif)onNavNotif(n.modulo);setShowNotif(false);}}
                    style={{display:"flex",gap:10,padding:"10px 14px",borderBottom:"1px solid var(--bd)",cursor:n.modulo?"pointer":"default",background:n.leida?"transparent":"rgba(74,159,212,.04)",transition:"background .15s"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:NOTIF_COL[n.tipo]||C.blue,flexShrink:0,marginTop:5}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:n.leida?400:700,color:"var(--t1)",marginBottom:1}}>{n.titulo}</div>
                      <div style={{fontSize:11,color:"var(--t3)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.cuerpo}</div>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:3,opacity:.7}}>{n.fecha}</div>
                    </div>
                  </div>
                ))
              }
            </div>
            {(notifs||[]).length>0&&<div style={{padding:"8px 14px",borderTop:"1px solid var(--bd)",textAlign:"center"}}>
              <button style={{fontSize:11,color:C.blue,background:"none",border:"none",cursor:"pointer",fontWeight:600}} onClick={()=>{if(onNavNotif)onNavNotif("notificaciones");setShowNotif(false);}}>Ver todas →</button>
            </div>}
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:2}}>
              <button
                className={"btn btn-sm "+(tourActivo?"btn-p":"btn-s")}
                onClick={onTourToggle}
                title="Guía del flujo comercial"
              >🎓 Guía</button>
              {!tourActivo&&<button className="btn btn-s btn-sm"
                onClick={()=>onTourToggle&&onTourToggle("modulos")}
                title="Tour de módulos"
                style={{fontSize:10,padding:"4px 6px"}}>📋</button>}
            </div>
      <button className="btn btn-s btn-sm" onClick={onDark}>{dark?I.sun:I.moon}</button>
      <div style={{position:"relative"}}>
        <div onClick={()=>{setMenu(s=>!s);setShowNotif(false);}} style={{width:32,height:32,borderRadius:"50%",background:usuario.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,cursor:"pointer",border:`2px solid ${usuario.color}50`}}>{usuario.avatar}</div>
        {menu&&(
          <div style={{position:"absolute",right:0,top:38,background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)",boxShadow:"0 8px 24px rgba(0,0,0,.12)",minWidth:210,zIndex:100}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)"}}><div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{usuario.nombre}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{usuario.email}</div><span className="pill teal" style={{marginTop:6,display:"inline-flex"}}>{usuario.rol}</span></div>
            <div style={{padding:8}}>
              <button className="btn btn-s" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 10px",marginBottom:4}} onClick={()=>{setMenu(false);onReset();}}>
                {I.reset} Restablecer datos
              </button>
              <button className="btn btn-r" style={{width:"100%",justifyContent:"flex-start",gap:8,padding:"7px 10px"}} onClick={()=>{setMenu(false);onLogout();}}>
                {I.logout} Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ==============================================================================
// DASHBOARD  — NOTA: "Dashboard", "Pipeline", "Win Rate", "KPI" NO se traducen
// ==============================================================================
const WIDGETS_DEF=[
  {id:"kpis",       lbl:"KPIs Principales"},
  {id:"kpis2",      lbl:"KPIs Secundarios"},
  {id:"chart1",     lbl:"Ingresos vs. Pipeline"},
  {id:"chart2",     lbl:"Sectores"},
  {id:"chart3",     lbl:"Win Rate"},
  {id:"forecast",   lbl:"Forecast 90 días"},
  {id:"consultores",lbl:"Rentabilidad por Consultor"},
  {id:"trimestral", lbl:"Comparativo Trimestral"},
  {id:"alertas",    lbl:"Motor de Alertas"},
  {id:"feed",       lbl:"Actividad Reciente"},
  {id:"tabla",      lbl:"Proyectos en Ejecución"},
];

// -- Hook reutilizable para drag & drop de paneles --
function useDragSort(initialItems, storageKey) {
  const [items, setItems] = useState(()=>{
    try{
      const s=localStorage.getItem("aq_layout_"+storageKey);
      return s?JSON.parse(s):initialItems;
    }catch{return initialItems;}
  });
  const [dragging, setDragging] = useState(null);
  const [dragOver,  setDragOver]  = useState(null);
  const [dragPos,   setDragPos]   = useState({x:0,y:0});

  const save = (newItems) => {
    setItems(newItems);
    try{localStorage.setItem("aq_layout_"+storageKey, JSON.stringify(newItems));}catch{}
  };
  const reset = (def) => { save(def||initialItems); };

  const onDragStart = (e,id) => {
    setDragging(id);
    setDragPos({x:e.clientX,y:e.clientY});
    e.dataTransfer.effectAllowed="move";
    // Imagen fantasma translúcida
    const el=e.currentTarget;
    const ghost=el.cloneNode(true);
    ghost.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:.7;pointer-events:none;width:"+el.offsetWidth+"px;transform:rotate(1.5deg) scale(1.03)";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost,el.offsetWidth/2,30);
    setTimeout(()=>document.body.removeChild(ghost),0);
  };
  const onDragOver = (e,id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect="move";
    if(id!==dragOver) setDragOver(id);
    setDragPos({x:e.clientX,y:e.clientY});
  };
  const onDrop = (e,targetId) => {
    e.preventDefault();
    if(!dragging||dragging===targetId){setDragging(null);setDragOver(null);return;}
    const arr=[...items];
    const from=arr.indexOf(dragging);
    const to=arr.indexOf(targetId);
    arr.splice(from,1);
    arr.splice(to,0,dragging);
    save(arr);
    setDragging(null);setDragOver(null);
  };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };

  const dragProps = (id) => ({
    draggable: true,
    onDragStart: e=>onDragStart(e,id),
    onDragOver:  e=>onDragOver(e,id),
    onDrop:      e=>onDrop(e,id),
    onDragEnd,
  });

  const dragStyle = (id) => ({
    opacity: dragging===id ? 0.4 : 1,
    outline: dragOver===id ? `2px dashed ${C.blue}` : "none",
    outlineOffset: dragOver===id ? "2px" : "0",
    transform: dragging===id ? "scale(1.02) rotate(1deg)" : dragOver===id ? "scale(1.01)" : "scale(1)",
    transition: "opacity .15s, transform .15s, outline .1s, box-shadow .15s",
    cursor: "grab",
    boxShadow: dragOver===id ? "0 8px 24px rgba(74,159,212,.2)" : "none",
    borderRadius: "var(--r)",
  });

  return {items, reset, dragProps, dragStyle, dragging, dragOver};
}

// -- Componente DragGrid — grilla con cards reordenables --
function DragGrid({items, storageKey, cols="repeat(auto-fill,minmax(280px,1fr))", gap=14, renderItem}) {
  const {items:order, reset, dragProps, dragStyle} = useDragSort(items.map((_,i)=>i), storageKey);
  const sorted = order.map(i=>items[i]).filter(Boolean);
  return(
    <div style={{display:"grid",gridTemplateColumns:cols,gap,alignItems:"start"}}>
      {sorted.map((item,idx)=>(
        <div key={order[idx]} {...dragProps(order[idx])} style={{...dragStyle(order[idx])}}>
          {renderItem(item,idx)}
        </div>
      ))}
    </div>
  );
}

function Dashboard({proyectos,leads,cotizaciones=[],alertas,toast,usuario,periodo="mensual",setPeriodo}) {
  // -- Filtro de visibilidad por rol --------------------------------------
  const esAdminDash = ["Admin","Gerencia","Finanzas"].includes(usuario?.rol);
  const leadsVis = (() => {
    if(esAdminDash) return leads;
    const f={};
    Object.entries(leads).forEach(([s,arr])=>{
      f[s]=arr.filter(l=>!l.exec||l.exec===usuario?.nombre);
    });
    return f;
  })();
  const proyVis = (() => {
    if(esAdminDash) return proyectos;
    if(usuario?.rol==="Jefe Proyecto")
      return proyectos.filter(p=>p.jefe===usuario?.nombre);
    if(usuario?.rol==="Consultor")
      return proyectos.filter(p=>(p.personal||[]).some(pe=>pe.cargo&&(pe.nombre||pe.cargo)===usuario?.nombre));
    return proyectos; // Operaciones ve todo
  })();
  const {items:order, reset:resetLayout, dragProps, dragStyle} = useDragSort(
    WIDGETS_DEF.map(w=>w.id),
    "dashboard_"+usuario.email
  );
  const [filtAlerta,setFiltAlerta]=useState("todas");

  const allLeads=Object.values(leadsVis).flat();
  const tc=proyectos.reduce((a,p)=>a+p.valor,0);
  const tCob=proyectos.reduce((a,p)=>a+p.cobrado,0);
  const mg=proyectos.length>0?proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length:0;
  const dotC={critical:C.red,warning:C.amber,info:C.blue,success:C.teal};
  const pM={critical:"red",warning:"amber",info:"blue",success:"teal"};
  const af=filtAlerta==="todas"?alertas:alertas.filter(a=>a.lv===filtAlerta);
  const HIST=[{mes:"Oct",ganado:18500,pipeline:42000,costos:14500},{mes:"Nov",ganado:22000,pipeline:61000,costos:17000},{mes:"Dic",ganado:31500,pipeline:55000,costos:24100},{mes:"Ene",ganado:14000,pipeline:78000,costos:10600},{mes:"Feb",ganado:26500,pipeline:93000,costos:20100},{mes:"Mar",ganado:43000,pipeline:118000,costos:32200}];
  const leadsFlat2=(Object.values(leads||{})).flat();
  const sectCount=leadsFlat2.reduce((a,l)=>{const s=l.sec||"Otros";a[s]=(a[s]||0)+1;return a},{});
  const sectTotal2=Math.max(Object.values(sectCount).reduce((a,v)=>a+v,0),1);
  const SECT_COLORS={"Minería":C.navy,"Industrial":C.blue,"Retail":C.teal,"Servicios":C.amber,"Otros":"#94a3b8"};
  const SECT=Object.entries(sectCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>({
    n,v:Math.round(v/sectTotal2*100),c:SECT_COLORS[n]||C.blue
  }));
  const now2=new Date();
  const WIN_H=Array.from({length:6},(_,i)=>{
    const d=new Date(now2.getFullYear(),now2.getMonth()-5+i,1);
    const mes=d.toLocaleDateString("es-PE",{month:"short"}).replace(".","");
    const ym=d.getFullYear()+"-"+(d.getMonth()+1).toString().padStart(2,"0");
    const leadsFlat3=(Object.values(leads||{})).flat();
    const t=leadsFlat3.filter(l=>(l.last||"").startsWith(ym)).length||
             Math.round(20+Math.random()*30); // fallback si no hay datos
    return {mes:mes.charAt(0).toUpperCase()+mes.slice(1),t};
  });
  const FEED=[{u:"WL",c:C.navy,tx:"Actualizó fase Tottus → Propuesta",tm:"Hace 1h"},{u:"PV",c:C.teal,tx:"Reunión Backus — propuesta aprobada",tm:"Hace 3h"},{u:"WL",c:C.navy,tx:"Ferreyros en negociación — $28,000",tm:"Hace 5h"},{u:"SYS",c:C.amber,tx:"Alerta: Pacasmayo sin actividad 5d",tm:"Hace 8h"}];
  // Forecast — proyección simple basada en tendencia de últimos 3 meses
  const avgCrecimiento = 0.12;
  const FORECAST=[
    {mes:"Mar",real:43000,proyectado:null,tipo:"real"},
    {mes:"Abr",real:null,proyectado:Math.round(43000*(1+avgCrecimiento)),tipo:"forecast"},
    {mes:"May",real:null,proyectado:Math.round(43000*(1+avgCrecimiento)**2),tipo:"forecast"},
    {mes:"Jun",real:null,proyectado:Math.round(43000*(1+avgCrecimiento)**3),tipo:"forecast"},
  ];
  const FORECAST_FULL=[...HIST.slice(-3).map(h=>({...h,proyectado:null})),...FORECAST.slice(1)];
  // Datos por consultor
  const CONSULT_DATA=[
    {n:"Carlos Quispe",  horas:524,  margen:24.1,valor:11200,col:C.blue},
    {n:"Ana Torres",     horas:400,  margen:22.8,valor:8600, col:C.amber},
    {n:"María López",    horas:176,  margen:24.1,valor:4700, col:C.purple},
    {n:"Luis Gómez",     horas:300,  margen:22.8,valor:3200, col:C.teal},
  ];
  // Comparativo trimestral
  const TRIM=[
    {trim:"Q1 2025",ingresos:48000,costos:37000,margen:22.9},
    {trim:"Q2 2025",ingresos:62000,costos:47000,margen:24.2},
    {trim:"Q3 2025",ingresos:55000,costos:43000,margen:21.8},
    {trim:"Q4 2025",ingresos:71000,costos:54000,margen:23.9},
    {trim:"Q1 2026",ingresos:tc,   costos:Math.round(tc*(1-mg/100)),margen:parseFloat(f1(mg))},
  ];

  const renderWidget=(id)=>{
    const wrapStyle={...dragStyle(id),position:"relative"};
    const dProps=dragProps(id);
    const dragHandle=(
      <div title="Arrastra para mover" style={{position:"absolute",top:6,right:8,color:"var(--t3)",fontSize:13,cursor:"grab",userSelect:"none",zIndex:10,opacity:.4,transition:"opacity .15s"}}
        onMouseEnter={e=>e.currentTarget.style.opacity="1"}
        onMouseLeave={e=>e.currentTarget.style.opacity=".4"}>⠿</div>
    );

    if(id==="kpis") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative",gridColumn:"1/-1"}}>
        {dragHandle}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
          {[{l:"Pipeline Activo",v:"$"+fi(allLeads.filter(l=>l.stage!=="ganado").reduce((a,b)=>a+b.val,0)),s:"activo",col:"blue"},{l:"Proyectos Activos",v:proyectos.length,s:"en ejecución",col:"teal"},{l:"Contratado 2026",v:"$"+fi(tc),s:"acumulado",col:"navy"},{l:"Margen Promedio",v:f1(mg)+"%",s:"Meta: >22%",col:"teal"},{l:"Alertas Críticas",v:alertas.filter(a=>a.lv==="critical").length,s:"activas",col:"red"}].map((k,i)=>(
            <div key={i} data-tour={i===0?"kpi-pipeline":undefined} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div><div className="kpi-s">{k.s}</div></div>
          ))}
        </div>
      </div>
    );
    if(id==="kpis2") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative",gridColumn:"1/-1"}}>
        {dragHandle}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[{l:"Cobrado 2026",v:"$"+fi(tCob),col:"teal"},{l:"Por Cobrar",v:"$"+fi(proyectos.reduce((a,p)=>a+p.pendiente,0)),col:"amber"},{l:"Entregables Pend.",v:proyectos.flatMap(p=>p.fases.flatMap(f=>f.ents)).filter(e=>e.est!=="entregado").length,col:"amber"},{l:"Win Rate MTD",v:"67%",col:"blue"}].map((k,i)=>(
            <div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>
          ))}
        </div>
      </div>
    );
    if(id==="chart1") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div><div className="ct">Ingresos vs. Pipeline</div><div className="cs">USD · 6 meses</div></div></div>
          <div className="cb" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={HIST} margin={{top:4,right:8,left:-18,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                <XAxis dataKey="mes" tick={{fontSize:10,fill:"var(--t3)"}}/>
                <YAxis tick={{fontSize:10,fill:"var(--t3)"}}/>
                <Tooltip content={<CTip pre="$"/>}/>
                <Bar dataKey="ganado" name="Ganado" fill={C.teal} opacity={.85} radius={[2,2,0,0]}/>
                <Bar dataKey="costos" name="Costos" fill={C.navy} opacity={.5} radius={[2,2,0,0]}/>
                <Line type="monotone" dataKey="pipeline" name="Pipeline" stroke={C.blue} strokeWidth={2} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
    if(id==="chart2") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div><div className="ct">Sectores</div><div className="cs">% pipeline</div></div></div>
          <div className="cb" style={{paddingTop:8,display:"flex",alignItems:"center",gap:8}}>
            <ResponsiveContainer width="55%" height={170}><PieChart><Pie data={SECT} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="v" paddingAngle={3}>{SECT.map((s,i)=><Cell key={i} fill={s.c}/>)}</Pie><Tooltip formatter={v=>v+"%"}/></PieChart></ResponsiveContainer>
            <div style={{flex:1}}>{SECT.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><div style={{width:8,height:8,borderRadius:2,background:s.c,flexShrink:0}}/><span style={{fontSize:11,color:"var(--t2)",flex:1}}>{s.n}</span><span className="mono" style={{fontSize:11,fontWeight:700}}>{s.v}%</span></div>)}</div>
          </div>
        </div>
      </div>
    );
    if(id==="chart3") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div><div className="ct">Win Rate</div><div className="cs">% mensual</div></div></div>
          <div className="cb" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={WIN_H} margin={{top:4,right:8,left:-22,bottom:0}}>
                <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={.14}/><stop offset="95%" stopColor={C.teal} stopOpacity={.01}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                <XAxis dataKey="mes" tick={{fontSize:10,fill:"var(--t3)"}}/>
                <YAxis tick={{fontSize:10,fill:"var(--t3)"}} domain={[30,80]}/>
                <Tooltip content={<CTip suf="%"/>}/>
                <Area type="monotone" dataKey="t" name="Win Rate" stroke={C.teal} fill="url(#wg)" strokeWidth={2} dot={{r:3,fill:C.teal}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
    if(id==="alertas") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div className="ct">Motor de Alertas — Dinámico</div>
          <div style={{display:"flex",gap:4}}>
            {["todas","critical","warning","success"].map(lv=>(
              <button key={lv} onClick={()=>setFiltAlerta(lv)} style={{padding:"2px 8px",fontSize:10,fontWeight:600,borderRadius:10,border:"none",cursor:"pointer",background:filtAlerta===lv?(dotC[lv]||C.blue):"var(--hv)",color:filtAlerta===lv?"#fff":"var(--t2)",transition:"all .15s"}}>
                {lv==="todas"?"Todas":lv==="critical"?"Crítico":lv==="warning"?"Alerta":"Éxito"}
              </button>
            ))}
          </div>
        </div>
          <div style={{maxHeight:230,overflowY:"auto"}}>
            {af.slice(0,10).map((a,i)=>(
              <div key={i} className="a-row"><div className="a-dot" style={{background:dotC[a.lv]||C.blue}}/><div style={{flex:1,fontSize:12,lineHeight:1.4}}><span className={`pill ${pM[a.lv]||"blue"}`} style={{marginBottom:3,display:"inline-block"}}>{a.tag}</span><div style={{color:"var(--t1)"}}>{a.tx}</div></div><span style={{fontSize:11,color:"var(--t3)",flexShrink:0,fontFamily:"var(--mono)"}}>{a.tm}</span></div>
            ))}
            {af.length===0&&<div style={{padding:"24px",textAlign:"center",color:C.teal,fontSize:12}}>✅ Sin alertas activas</div>}
          </div>
        </div>
      </div>
    );
    if(id==="feed") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div className="ct">Actividad Reciente</div><span style={{fontSize:11,color:"var(--t3)"}}>Hoy, {new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"})}</span></div>
          <div style={{maxHeight:230,overflowY:"auto"}}>{FEED.map((f,i)=><div key={i} className="fi"><div style={{width:26,height:26,borderRadius:"50%",background:f.c,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{f.u}</div><div><div style={{fontSize:12,lineHeight:1.4,color:"var(--t1)"}}>{f.tx}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2,fontFamily:"var(--mono)"}}>{f.tm}</div></div></div>)}</div>
        </div>
      </div>
    );
    if(id==="tabla") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative",gridColumn:"1/-1"}}>
        {dragHandle}
        <div className="card"><div className="card-hd"><div className="ct">Proyectos en Ejecución</div></div>
          <div style={{overflowX:"auto"}}>
            <table>
              <thead><tr><th>N° Proyecto</th><th>Cliente</th><th>Valor</th><th>Fase</th><th>Avance</th><th>Margen</th><th>Cobrado</th><th>Estado</th></tr></thead>
              <tbody>{proyectos.map(p=>{const mgC=margenColor(p.margen);return(<tr key={p.id}><td><strong style={{fontFamily:"var(--mono)",color:C.blue}}>{p.id}</strong></td><td>{p.cliente}</td><td className="mono" style={{fontWeight:700}}>${fi(p.valor)}</td><td><span className="pill amber">{p.fase}</span></td><td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:72}}><PBar pct={p.avance} color={p.avance>=80?C.teal:C.amber}/></div><span className="mono" style={{fontSize:11}}>{p.avance}%</span></div></td><td className="mono" style={{fontWeight:700,color:mgC}}>{f1(p.margen)}%</td><td className="mono" style={{color:C.teal,fontWeight:600}}>${fi(p.cobrado)}</td><td><span className={`pill ${p.estado==="ejecucion"?"teal":"blue"}`}>{p.estado==="ejecucion"?"En Ejecución":"Iniciando"}</span></td></tr>);})}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
    if(id==="forecast") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative",gridColumn:"span 2"}}>
        {dragHandle}
        <div className="card">
          <div className="card-hd">
            <div><div className="ct">Forecast de Ingresos — 90 días</div><div className="cs">Proyección basada en tendencia de crecimiento del 12% mensual</div></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:8,height:8,borderRadius:2,background:C.teal}}/><span style={{fontSize:10,color:"var(--t3)"}}>Real</span>
              <div style={{width:8,height:8,borderRadius:2,background:C.blue,marginLeft:6}}/><span style={{fontSize:10,color:"var(--t3)"}}>Forecast</span>
            </div>
          </div>
          <div className="cb" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={FORECAST_FULL} margin={{top:4,right:8,left:-18,bottom:0}}>
                <defs>
                  <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.blue} stopOpacity={.12}/>
                    <stop offset="95%" stopColor={C.blue} stopOpacity={.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                <XAxis dataKey="mes" tick={{fontSize:10,fill:"var(--t3)"}}/>
                <YAxis tick={{fontSize:10,fill:"var(--t3)"}}/>
                <Tooltip content={<CTip pre="$"/>}/>
                <Bar dataKey="ganado" name="Real" fill={C.teal} opacity={.9} radius={[2,2,0,0]}/>
                <Area type="monotone" dataKey="proyectado" name="Forecast" stroke={C.blue} fill="url(#fg)" strokeWidth={2} strokeDasharray="5 3" dot={{r:4,fill:C.blue,strokeWidth:0}}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
              {FORECAST.slice(1).map((f,i)=>(
                <div key={i} style={{padding:"8px 12px",background:"var(--hv)",borderRadius:"var(--r)",borderLeft:"3px solid "+C.blue}}>
                  <div style={{fontSize:10,color:"var(--t3)",marginBottom:2}}>{f.mes} 2026</div>
                  <div className="mono" style={{fontSize:14,fontWeight:800,color:C.blue}}>{"$"+fi(f.proyectado)}</div>
                  <div style={{fontSize:9,color:C.teal,marginTop:2}}>↑ {Math.round(((f.proyectado-43000)/43000)*100)}% vs Mar</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
    if(id==="consultores") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card">
          <div className="card-hd"><div><div className="ct">Rentabilidad por Consultor</div><div className="cs">Mes actual</div></div></div>
          <div className="cb" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={CONSULT_DATA} layout="vertical" margin={{top:0,right:8,left:60,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:9,fill:"var(--t3)"}}/>
                <YAxis type="category" dataKey="n" tick={{fontSize:10,fill:"var(--t2)"}} width={58}/>
                <Tooltip content={<CTip pre="$"/>}/>
                <Bar dataKey="valor" name="Valor generado" radius={[0,3,3,0]}>
                  {CONSULT_DATA.map((c,i)=><Cell key={i} fill={c.col}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
              {CONSULT_DATA.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.col,flexShrink:0}}/>
                  <span style={{fontSize:11,color:"var(--t2)",flex:1}}>{c.n.split(" ")[0]}</span>
                  <span className="mono" style={{fontSize:10,color:"var(--t3)"}}>{c.horas}h</span>
                  <span className="mono" style={{fontSize:11,fontWeight:700,color:margenColor(c.margen)}}>{c.margen}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
    if(id==="trimestral") return(
      <div key={id} {...dProps} style={{...wrapStyle,position:"relative"}}>
        {dragHandle}
        <div className="card">
          <div className="card-hd"><div><div className="ct">Comparativo Trimestral</div><div className="cs">Ingresos · Costos · Margen</div></div></div>
          <div className="cb" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={TRIM} margin={{top:4,right:8,left:-18,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                <XAxis dataKey="trim" tick={{fontSize:9,fill:"var(--t3)"}}/>
                <YAxis yAxisId="left" tick={{fontSize:9,fill:"var(--t3)"}}/>
                <YAxis yAxisId="right" orientation="right" domain={[18,28]} tick={{fontSize:9,fill:"var(--t3)"}} unit="%"/>
                <Tooltip content={<CTip pre="$"/>}/>
                <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill={C.teal} opacity={.85} radius={[2,2,0,0]}/>
                <Bar yAxisId="left" dataKey="costos"   name="Costos"   fill={C.navy} opacity={.5}  radius={[2,2,0,0]}/>
                <Line yAxisId="right" type="monotone" dataKey="margen" name="Margen%" stroke={C.amber} strokeWidth={2} dot={{r:3,fill:C.amber}}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{marginTop:8,padding:"8px 10px",background:"var(--hv)",borderRadius:"var(--r)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:"var(--t3)"}}>Q1 2026 vs Q1 2025</span>
              <span className="mono" style={{fontSize:12,fontWeight:700,color:C.teal}}>+{Math.round(((tc-48000)/48000)*100)}% ingresos</span>
              <span className="mono" style={{fontSize:12,fontWeight:700,color:margenColor(parseFloat(f1(mg)))}}>Margen: {f1(mg)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
    return null;
  };


  return (
    <div>
      <div className="sh">
        <div><div className="st">Dashboard Gerencial</div><div className="ss">{new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})} · {alertas.filter(a=>a.lv==="critical").length} alertas críticas · Datos sincronizados</div></div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-s btn-sm" onClick={()=>{resetLayout(WIDGETS_DEF.map(w=>w.id));toast("Layout restablecido","success");}}>↺ Restablecer layout</button>
          <button className="btn btn-s btn-sm" onClick={()=>{
              const pend2=proyectos.reduce((a,p)=>a+(p.valor-p.cobrado),0);
              const pctC2=tc>0?Math.round(tCob/tc*100):0;
              const avgA2=proyectos.length>0?Math.round(proyectos.reduce((a,p)=>a+p.avance,0)/proyectos.length):0;
              const pip2=allLeads.filter(l=>l.stage!=="ganado").reduce((a,b)=>a+b.val,0);
              const mI=Math.max(...HIST.map(d=>d.ganado),1);
              let hC='<svg xmlns="http://www.w3.org/2000/svg" width="460" height="150" style="font-family:Segoe UI,sans-serif"><rect width="460" height="150" fill="#f8fafc" rx="6"/>';
              HIST.forEach((d,ii)=>{const x=18+ii*72;const hI=Math.max((d.ganado/mI)*100,3);const hCo=Math.max((d.costos/mI)*100,2);hC+='<rect x="'+x+'" y="'+(100-hI)+'" width="28" height="'+hI+'" fill="#4a9fd4" rx="2"/><rect x="'+(x+30)+'" y="'+(100-hCo)+'" width="28" height="'+hCo+'" fill="#E24B4A" rx="2"/><text x="'+(x+28)+'" y="118" fill="#64748b" font-size="9" text-anchor="middle">'+d.mes+'</text>';});
              hC+='<rect x="18" y="128" width="10" height="7" fill="#4a9fd4" rx="1"/><text x="32" y="134" fill="#64748b" font-size="9">Ingresos</text><rect x="100" y="128" width="10" height="7" fill="#E24B4A" rx="1"/><text x="114" y="134" fill="#64748b" font-size="9">Costos</text></svg>';
              const r2=44,cx=55,cy=55,ci=2*Math.PI*r2;
              let dn='<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(avgA2>=70?"#1D9E75":"#BA7517")+'" stroke-width="12" stroke-dasharray="'+(ci*avgA2/100)+' '+(ci*(1-avgA2/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1E293B" font-size="15" font-weight="800" text-anchor="middle">'+avgA2+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">avance</text></svg>';
              let dnC='<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(pctC2>=70?"#1D9E75":"#BA7517")+'" stroke-width="12" stroke-dasharray="'+(ci*pctC2/100)+' '+(ci*(1-pctC2/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1E293B" font-size="15" font-weight="800" text-anchor="middle">'+pctC2+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">cobrado</text></svg>';
              const tbl2='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">Proyecto</th><th style="padding:7px">Cliente</th><th style="padding:7px;text-align:right">Valor</th><th style="padding:7px;text-align:center">Avance</th><th style="padding:7px;text-align:center">Margen</th></tr>'+proyectos.map((p,ii)=>{const mc=p.margen>=30?"#166534":p.margen>=22?"#1e40af":"#991b1b";return'<tr style="background:'+(ii%2?"#f1f5f9":"#fff")+'"><td style="padding:6px 10px;color:#4a9fd4;font-weight:700;font-size:10px">'+p.id+'</td><td style="padding:6px 10px">'+p.cliente+'</td><td style="padding:6px;text-align:right;font-family:monospace">$'+fi(p.valor)+'</td><td style="padding:6px;text-align:center"><span style="background:'+mc+'20;color:'+mc+';padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">'+p.avance+'%</span></td><td style="padding:6px;text-align:center"><span style="background:'+mc+'20;color:'+mc+';padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">'+f1(p.margen)+'%</span></td></tr>';}).join('')+'</table>';
              const pR2=proyectos.filter(p=>p.margen<22||p.avance<30);const pO2=proyectos.filter(p=>p.margen>=30&&p.avance>=50);
              generarPDFRico({nombre:"Dashboard_"+new Date().toLocaleDateString("es-PE").replace(/\//g,"-"),titulo:"Dashboard Gerencial",subtitulo:proyectos.length+" proyectos · USD "+fi(tc)+" · Margen: "+f1(mg)+"%",kpis:[{label:"Pipeline",value:"$"+fi(pip2),color:"#4a9fd4"},{label:"Contratado",value:"$"+fi(tc),color:"#1E293B"},{label:"Cobrado",value:"$"+fi(tCob),color:"#1D9E75"},{label:"Pendiente",value:"$"+fi(pend2),color:"#BA7517"},{label:"Margen",value:f1(mg)+"%",color:mg>=30?"#1D9E75":mg>=22?"#4a9fd4":"#E24B4A"},{label:"Avance",value:avgA2+"%",color:avgA2>=70?"#1D9E75":"#BA7517"},{label:"Cobranza",value:pctC2+"%",color:pctC2>=70?"#1D9E75":"#BA7517"},{label:"Proyectos",value:proyectos.length,color:"#1E293B"}],secciones:[{titulo:"Evolución Financiera 6 Meses",contenido:'<div style="display:flex;gap:12px;align-items:center">'+hC+'<div>'+dn+'<p style="font-size:9px;color:#94a3b8;text-align:center;margin-top:2px">Avance</p></div><div>'+dnC+'<p style="font-size:9px;color:#94a3b8;text-align:center;margin-top:2px">Cobranza</p></div></div>'},{titulo:"Estado de Proyectos",contenido:tbl2}],analisis:{situacion:"Cartera activa: <strong>"+proyectos.length+" proyectos</strong>, USD "+fi(tc)+" contratado. Margen: <strong>"+f1(mg)+"%</strong> "+(mg>=30?"— supera objetivo ISO 9001 (30%).":mg>=22?"— en rango aceptable.":"— por debajo del mínimo.")+" Cobranza: <strong>"+pctC2+"%</strong>, USD "+fi(pend2)+" pendiente.",logros:pO2.length>0?"Proyectos destacados: "+pO2.map(p=>"<strong>"+p.cliente+"</strong> — avance "+p.avance+"%, margen "+f1(p.margen)+"%").join(" · "):undefined,riesgos:pR2.length>0?"Requieren atención: "+pR2.map(p=>"<strong>"+p.cliente+"</strong> — "+(p.margen<22?"margen "+f1(p.margen)+"%":"")+((p.margen<22&&p.avance<30)?", ":"")+(p.avance<30?"avance "+p.avance+"%":"")).join(" · "):undefined,recomendaciones:"<strong>1.</strong> Cobrar USD "+fi(pend2)+" pendientes.<br/><strong>2.</strong> "+(mg<30?"Revisar costos en "+proyectos.filter(p=>p.margen<30).length+" proyecto(s) bajo 30%.":"Mantener control de costos.")+"<br/><strong>3.</strong> Mantener 2-3 propuestas en negociación.<br/><strong>4.</strong> Facturar al completar cada fase."}});toast("✓ Dashboard PDF generado","success");
          }}>{I.dl} PDF</button>
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--t3)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
        <span>⠿</span><span>Arrastra cualquier widget para reorganizar el dashboard — se guarda automáticamente</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:12}}>
        {order.map(id=>renderWidget(id))}
      </div>

      {/* === NUEVOS KPIs GERENCIALES === */}
      <div style={{marginTop:20}}>
        <div className="sh" style={{marginBottom:12}}>
          <div>
            <div className="st">Análisis Estadístico</div>
            <div className="ss">Ventas · Margen por sector · Tipo de servicio</div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>

          {/* DASH.1 — Ventas por mes (USD y Soles) */}
          {(()=>{
            const meses=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
            const anioActual=new Date().getFullYear();
            const ventasMes=Array.from({length:12},(_,m)=>{
              const usd=proyectos
                .filter(p=>new Date(p.inicio).getMonth()===m&&new Date(p.inicio).getFullYear()===anioActual)
                .reduce((a,p)=>a+p.valor,0);
              return {mes:meses[m],usd,soles:Math.round(usd*3.4)};
            });
            const maxUSD=Math.max(...ventasMes.map(v=>v.usd),1);
            return(
              <div className="card" style={{padding:16}}>
                <div className="ct" style={{marginBottom:4}}>Ventas por Mes</div>
                <div className="cs" style={{marginBottom:12}}>USD · Soles (TC 3.40)</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {ventasMes.filter(v=>v.usd>0).map((v,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:11}}>
                      <span style={{width:28,color:"var(--t3)",fontSize:10}}>{v.mes}</span>
                      <div style={{flex:1,height:14,background:"var(--bg2)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:(v.usd/maxUSD*100)+"%",
                          background:"linear-gradient(90deg,"+C.navy+","+C.blue+")",borderRadius:3,
                          transition:"width .3s"}}/>
                      </div>
                      <span style={{width:70,textAlign:"right",fontFamily:"monospace",fontSize:10,
                        color:C.navy,fontWeight:700}}>${fi(v.usd)}</span>
                      <span style={{width:72,textAlign:"right",fontFamily:"monospace",fontSize:10,
                        color:C.teal}}>S/{fi(v.soles)}</span>
                    </div>
                  ))}
                  {ventasMes.filter(v=>v.usd>0).length===0&&(
                    <div style={{textAlign:"center",padding:20,color:"var(--t3)",fontSize:12}}>
                      Sin proyectos registrados este año
                    </div>
                  )}
                </div>
                <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid var(--bd)",
                  display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:"var(--t3)"}}>Total año</span>
                  <div style={{display:"flex",gap:12}}>
                    <span style={{fontWeight:700,color:C.navy}}>${fi(proyectos.reduce((a,p)=>a+p.valor,0))}</span>
                    <span style={{fontWeight:700,color:C.teal}}>S/{fi(Math.round(proyectos.reduce((a,p)=>a+p.valor,0)*3.4))}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DASH.2 — Margen por sector */}
          {(()=>{
            const sectores={};
            proyectos.forEach(p=>{
              const s=p.sector||Object.values(leadsVis).flat().find(l=>l.co===p.cliente)?.sec||"Otros";
              if(!sectores[s]) sectores[s]={sector:s,contratos:0,cobrado:0,margenSum:0,count:0};
              sectores[s].contratos+=p.valor;
              sectores[s].cobrado+=p.cobrado;
              sectores[s].margenSum+=p.margen;
              sectores[s].count++;
            });
            const sectData=Object.values(sectores).sort((a,b)=>b.contratos-a.contratos);
            const colores=[C.navy,C.blue,C.teal,C.amber,C.red,"#7c3aed","#64748b"];
            return(
              <div className="card" style={{padding:16}}>
                <div className="ct" style={{marginBottom:4}}>Margen por Sector</div>
                <div className="cs" style={{marginBottom:12}}>Rentabilidad objetivo ≥30%</div>
                {sectData.length>0?(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {sectData.map((s,i)=>{
                      const mg=s.count>0?Math.round(s.margenSum/s.count):0;
                      const col=mg>=30?C.teal:mg>=22?C.amber:C.red;
                      return(
                        <div key={i}>
                          <div style={{display:"flex",justifyContent:"space-between",
                            fontSize:11,marginBottom:3}}>
                            <span style={{fontWeight:600,color:"var(--t1)"}}>{s.sector}</span>
                            <div style={{display:"flex",gap:8}}>
                              <span style={{color:"var(--t3)",fontSize:10}}>${fi(s.contratos)}</span>
                              <span style={{fontWeight:700,color:col,fontSize:11}}>{mg}%</span>
                            </div>
                          </div>
                          <div style={{height:8,background:"var(--bg2)",borderRadius:4,overflow:"hidden"}}>
                            <div style={{height:"100%",width:Math.min(mg/50*100,100)+"%",
                              background:col,borderRadius:4,transition:"width .3s"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ):(
                  <div style={{textAlign:"center",padding:20,color:"var(--t3)",fontSize:12}}>
                    Sin datos de proyectos
                  </div>
                )}
                <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid var(--bd)",fontSize:11,
                  display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"var(--t3)"}}>Margen promedio global</span>
                  <span style={{fontWeight:700,
                    color:proyectos.length>0&&proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length>=30?C.teal:C.amber}}>
                    {proyectos.length>0?f1(proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length):0}%
                  </span>
                </div>
              </div>
            );
          })()}

          {/* DASH.3 — Ventas por tipo de servicio */}
          {(()=>{
            const servicios={};
            // Desde cotizaciones
            cotizaciones.forEach(c=>{
              const s=c.servicio||c.proyecto||"Sin clasificar";
              const key=s.substring(0,35);
              if(!servicios[key]) servicios[key]={nombre:key,total:0,count:0};
              servicios[key].total+=c.venta||0;
              servicios[key].count++;
            });
            // Desde leads ganados si no hay cotizaciones
            Object.values(leadsVis).flat().filter(l=>l.stage==="ganado").forEach(l=>{
              const s=(l.tags&&l.tags[0])||"Sin clasificar";
              if(!servicios[s]) servicios[s]={nombre:s,total:0,count:0};
              servicios[s].total+=l.val||0;
              servicios[s].count++;
            });
            const srvData=Object.values(servicios).sort((a,b)=>b.total-a.total).slice(0,7);
            const maxSrv=Math.max(...srvData.map(s=>s.total),1);
            const colores=[C.navy,C.blue,C.teal,C.amber,"#7c3aed",C.red,"#64748b"];
            return(
              <div className="card" style={{padding:16}}>
                <div className="ct" style={{marginBottom:4}}>Ventas por Tipo de Servicio</div>
                <div className="cs" style={{marginBottom:12}}>Basado en cotizaciones emitidas</div>
                {srvData.length>0?(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {srvData.map((s,i)=>(
                      <div key={i}>
                        <div style={{display:"flex",justifyContent:"space-between",
                          fontSize:10,marginBottom:2}}>
                          <span style={{color:"var(--t2)",fontWeight:600,
                            maxWidth:"60%",overflow:"hidden",textOverflow:"ellipsis",
                            whiteSpace:"nowrap"}}>{s.nombre}</span>
                          <div style={{display:"flex",gap:8}}>
                            <span style={{color:"var(--t3)"}}>{s.count}cot.</span>
                            <span style={{fontWeight:700,color:colores[i]||C.blue}}>
                              ${fi(s.total)}</span>
                          </div>
                        </div>
                        <div style={{height:7,background:"var(--bg2)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:(s.total/maxSrv*100)+"%",
                            background:colores[i]||C.blue,borderRadius:3,transition:"width .3s"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{textAlign:"center",padding:20,color:"var(--t3)",fontSize:12}}>
                    Sin cotizaciones registradas
                  </div>
                )}
                <div style={{marginTop:10,paddingTop:8,borderTop:"1px solid var(--bd)",
                  fontSize:11,display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"var(--t3)"}}>Total cotizado</span>
                  <span style={{fontWeight:700,color:C.navy}}>
                    ${fi(cotizaciones.reduce((a,c)=>a+(c.venta||0),0))}
                  </span>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// CRM  — NOTA: "Pipeline", "Lead", "Score", "Kanban" NO se traducen
// ==============================================================================
const STAGES=[
  {id:"prospecto",  lbl:"Prospecto",  color:C.blue,  pill:"blue"},
  {id:"calificado", lbl:"Calificado", color:C.navy,  pill:"navy"},
  {id:"propuesta",  lbl:"Propuesta",  color:C.amber, pill:"amber"},
  {id:"negociacion",lbl:"Negociación",color:C.purple,pill:"purple"},
  {id:"ganado",    lbl:"Ganado",     color:C.teal,  pill:"teal"},
];

// -- Plantillas de seguimiento automatizado --
const PLANTILLAS_FOLLOWUP = [
  {id:"T01",etapa:"propuesta",dias:3, asunto:"Seguimiento propuesta — Nexova CRM Pro",
   cuerpo:"Estimado {contacto},\n\nEspero que se encuentre bien. Me comunico para hacer seguimiento a la propuesta que le enviamos el {fecha_envio} para el proyecto de {proyecto}.\n\n¿Tuvo la oportunidad de revisarla? Quedamos disponibles para resolver cualquier consulta o ajustar el alcance según sus necesidades.\n\nQuedamos atentos.\n\nSaludos,\n{usuario}"},
  {id:"T02",etapa:"propuesta",dias:7, asunto:"Segunda revisión — Propuesta {proyecto}",
   cuerpo:"Estimado {contacto},\n\nLe escribo nuevamente respecto a nuestra propuesta para {proyecto}. Entendemos que los procesos de evaluación toman tiempo.\n\nNos gustaría agendar una reunión breve para absolver sus dudas y conocer su retroalimentación. ¿Tendría disponibilidad esta semana?\n\nSaludos,\n{usuario}"},
  {id:"T03",etapa:"calificado",dias:5, asunto:"Propuesta comercial lista — {empresa}",
   cuerpo:"Estimado {contacto},\n\nEs un gusto saludarlo. Hemos preparado una propuesta comercial personalizada para {empresa} considerando sus necesidades específicas.\n\nPodemos enviarla hoy mismo o coordinar una presentación. ¿Cuál prefiere?\n\nSaludos,\n{usuario}"},
  {id:"T04",etapa:"negociacion",dias:2, asunto:"Pendientes de negociación — {proyecto}",
   cuerpo:"Estimado {contacto},\n\nComo acordamos, adjunto el detalle de los puntos pendientes para avanzar con la firma del contrato.\n\nQuedamos disponibles para coordinar los últimos detalles.\n\nSaludos,\n{usuario}"},
];

const SECUENCIAS_INIT = [
  {id:"S001",leadId:"L003",cliente:"Tottus / Falabella",etapa:"propuesta",
   activa:true,fechaInicio:"2026-04-01",
   pasos:[
     {n:1,plantilla:"T01",diasDesde:3, estado:"propuesta",fecha:"2026-04-04"},
     {n:2,plantilla:"T02",diasDesde:7, estado:"propuesta",fecha:"2026-04-08"},
   ]},
  {id:"S002",leadId:"L005",cliente:"Ferreyros S.A.",etapa:"negociacion",
   activa:true,fechaInicio:"2026-04-01",
   pasos:[
     {n:1,plantilla:"T04",diasDesde:2, estado:"completado",fecha:"2026-04-03"},
     {n:2,plantilla:"T04",diasDesde:5, estado:"propuesta",fecha:"2026-04-06"},
   ]},
];

function ModalFollowUp({lead,onClose,toast}) {
  const [plantilla,setPlantilla] = useState(PLANTILLAS_FOLLOWUP.find(p=>p.etapa===lead.stage)||PLANTILLAS_FOLLOWUP[0]);
  const [asunto,setAsunto]       = useState("");
  const [cuerpo,setCuerpo]       = useState("");

  useEffect(()=>{
    const p = PLANTILLAS_FOLLOWUP.find(x=>x.etapa===lead.stage)||PLANTILLAS_FOLLOWUP[0];
    setPlantilla(p);
    setAsunto(p.asunto.replace("{proyecto}",lead.co));
    setCuerpo(p.cuerpo
      .replace(/{contacto}/g,lead.ct)
      .replace(/{empresa}/g,lead.co)
      .replace(/{proyecto}/g,lead.co)
      .replace(/{fecha_envio}/g,fmtFecha(lead.last))
      .replace(/{usuario}/g,"NEXOVA")
    );
  },[]);

  const seleccionarPlantilla = (p) => {
    setPlantilla(p);
    setAsunto(p.asunto.replace("{proyecto}",lead.co));
    setCuerpo(p.cuerpo
      .replace(/{contacto}/g,lead.ct)
      .replace(/{empresa}/g,lead.co)
      .replace(/{proyecto}/g,lead.co)
      .replace(/{fecha_envio}/g,fmtFecha(lead.last))
      .replace(/{usuario}/g,"NEXOVA")
    );
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:600,maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Follow-up — {lead.co}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{lead.ct} · {lead.stage}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
        </div>
        <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Plantillas */}
          <div>
            <label className="fl">Plantilla de seguimiento</label>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:6}}>
              {PLANTILLAS_FOLLOWUP.map(p=>(
                <div key={p.id} onClick={()=>seleccionarPlantilla(p)}
                  style={{padding:"8px 12px",borderRadius:"var(--r)",border:`1px solid ${plantilla.id===p.id?C.blue:"var(--bd)"}`,background:plantilla.id===p.id?"rgba(74,159,212,.06)":"var(--bg)",cursor:"pointer",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{p.asunto.replace("{proyecto}",lead.co)}</div>
                    <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:"rgba(74,159,212,.1)",color:C.blue,fontWeight:600,flexShrink:0,marginLeft:8}}>Día {p.dias} · {p.etapa}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Asunto */}
          <div><label className="fl">Asunto del correo</label><input value={asunto} onChange={e=>setAsunto(e.target.value)}/></div>
          {/* Cuerpo */}
          <div><label className="fl">Mensaje</label><textarea value={cuerpo} onChange={e=>setCuerpo(e.target.value)} rows={10} style={{resize:"vertical",fontFamily:"var(--font)",fontSize:12,lineHeight:1.6}}/></div>
          {/* Pie */}
          <div style={{padding:"10px 12px",background:"rgba(74,159,212,.06)",border:"1px solid rgba(74,159,212,.15)",borderRadius:"var(--r)",fontSize:11,color:C.blue}}>
            📧 Este mensaje se copiará al portapapeles para enviarlo desde tu cliente de correo habitual.
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-s btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-p btn-sm" onClick={()=>{
              navigator.clipboard.writeText("Asunto: "+asunto+"\n\n"+cuerpo).catch(()=>{});
              toast("✓ Mensaje copiado al portapapeles","success");
              onClose();
            }}>{I.mail} Copiar mensaje</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalNuevoLead({onClose,onSave,usuario}) {
  const [f,setF]=useState({co:"",ruc:"",ct:"",cargo:"",tel:"",email:"",val:"",sec:"Minería",stage:"prospecto",temp:"WARM",prob:50,notas:"",tags:""});
  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const SECS=["Minería","Manufactura","Retail","Logística","Construcción","Financiero","Salud","Gobierno","Otro"];
  const ok=f.co.trim()&&f.ct.trim()&&parseFloat(f.val)>0;
  const save=()=>{
    if(!ok)return;
    const id="L"+(Date.now()%10000);
    onSave({id,exec:usuario?.nombre||"",co:f.co.trim(),ruc:f.ruc.trim(),ct:f.ct.trim(),cargo:f.cargo.trim(),tel:f.tel.trim(),email:f.email.trim(),val:parseFloat(f.val)||0,sec:f.sec,stage:f.stage,temp:f.temp||"WARM",prob:parseInt(f.prob)||50,notes:f.notas.trim(),tags:f.tags.split(",").map(t=>t.trim()).filter(Boolean),score:Math.round(f.prob*0.6+20),last:"2026-04-02",acts:[]});
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{padding:"18px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>Nuevo Lead</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"20px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{gridColumn:"1/-1"}}><label className="fl">Empresa *</label><input value={f.co} onChange={e=>upd("co",e.target.value)} placeholder="Razón social"/></div>
            <div><label className="fl">RUC</label><input value={f.ruc} onChange={e=>upd("ruc",e.target.value)} placeholder="20xxxxxxxxx"/></div>
            <div>
              <label className="fl">Sector</label>
              <select value={f.sec} onChange={e=>upd("sec",e.target.value)}>
                {SECS.map(s=><option key={s}>{s}</option>)}
              </select>
              {f.sec==="Otro"&&(
                <input value={f.secOtro||""} onChange={e=>upd("secOtro",e.target.value)}
                  placeholder="Especificar sector..." style={{marginTop:4,fontSize:11}}/>
              )}
            </div>
            <div><label className="fl">Contacto *</label><input value={f.ct} onChange={e=>upd("ct",e.target.value)} placeholder="Nombre completo"/></div>
            <div><label className="fl">Cargo</label><input value={f.cargo} onChange={e=>upd("cargo",e.target.value)} placeholder="Gerente de Proyectos"/></div>
            <div><label className="fl">Teléfono</label><input value={f.tel} onChange={e=>upd("tel",e.target.value)} placeholder="+51 9xx xxx xxx"/></div>
            <div><label className="fl">Email</label><input type="email" value={f.email} onChange={e=>upd("email",e.target.value)} placeholder="nombre@empresa.com"/></div>
            <div><label className="fl">Valor estimado (USD) *</label><input type="number" value={f.val} onChange={e=>upd("val",e.target.value)} placeholder="25000"/></div>
            <div><label className="fl">Probabilidad cierre (%)</label><input type="range" min="5" max="95" step="5" value={f.prob} onChange={e=>upd("prob",e.target.value)} style={{width:"100%",marginTop:6}}/><div style={{fontSize:11,color:"var(--t2)",textAlign:"right"}}>{f.prob}%</div></div>
            <div><label className="fl">Etapa inicial</label><select value={f.stage} onChange={e=>upd("stage",e.target.value)}><option value="prospecto">Prospecto</option><option value="calificado">Calificado</option><option value="propuesta">Propuesta</option><option value="negociacion">Negociación</option></select></div>
            <div><label className="fl">Temperatura</label>
              <div style={{display:"flex",gap:6}}>
                {[{v:"HOT",lbl:"🔥 HOT",col:"#E24B4A"},{v:"WARM",lbl:"🟡 WARM",col:"#BA7517"},{v:"COLD",lbl:"❄️ COLD",col:"#4a9fd4"}].map(t=>(
                  <button key={t.v} type="button" onClick={()=>upd("temp",t.v)}
                    style={{flex:1,padding:"5px",border:`2px solid ${f.temp===t.v?t.col:"var(--bd)"}`,
                      borderRadius:"var(--r)",background:f.temp===t.v?t.col+"20":"transparent",
                      color:f.temp===t.v?t.col:"var(--t3)",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {t.lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{gridColumn:"1/-1"}}><label className="fl">Notas</label><textarea value={f.notas} onChange={e=>upd("notas",e.target.value)} rows={3} placeholder="Contexto del cliente, necesidades, referencias…" style={{resize:"vertical"}}/></div>
            <div style={{gridColumn:"1/-1"}}><label className="fl">Tags (separados por coma)</label><input value={f.tags} onChange={e=>upd("tags",e.target.value)} placeholder="NIIF, SITIA, AF, urgente…"/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
            <button className="btn btn-s btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-p btn-sm" onClick={save} disabled={!ok} style={{opacity:ok?1:.5}}>{I.check} Crear Lead</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalActividad({lead,onClose,onSave,usuario}) {
  const [f,setF]=useState({tipo:"llamada",nota:"",fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"})});
  const TIPOS=[{v:"llamada",l:"📞 Llamada",k:"call"},{v:"reunion",l:"🤝 Reunión",k:"meeting"},{v:"email",l:"📧 Email",k:"mail"},{v:"whatsapp",l:"💬 WhatsApp",k:"msg"},{v:"tarea",l:"✅ Tarea",k:"task"}];
  const ok=f.nota.trim().length>=5;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Registrar Actividad</div><div style={{fontSize:11,color:"var(--t3)"}}>{lead.co}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"18px 20px"}}>
          <div style={{marginBottom:12}}><label className="fl">Tipo de actividad</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{TIPOS.map(t=><button key={t.v} onClick={()=>setF(p=>({...p,tipo:t.v}))} className={`btn btn-sm ${f.tipo===t.v?"btn-p":"btn-s"}`} style={{fontSize:11}}>{t.l}</button>)}</div>
          </div>
          <div style={{marginBottom:12}}><label className="fl">Nota de la actividad *</label><textarea value={f.nota} onChange={e=>setF(p=>({...p,nota:e.target.value}))} rows={4} placeholder="Describe el resultado de la actividad…" style={{resize:"vertical"}}/></div>
          <div style={{marginBottom:16}}><label className="fl">Fecha</label><input type="text" value={f.fecha} onChange={e=>setF(p=>({...p,fecha:e.target.value}))}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-s btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-p btn-sm" onClick={()=>{if(!ok)return;const t=TIPOS.find(x=>x.v===f.tipo);onSave({t:t.k,tx:f.nota,d:f.fecha,u:usuario.avatar});}} disabled={!ok} style={{opacity:ok?1:.5}}>{I.check} Guardar actividad</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalCotizacion({lead,onClose,onNav,toast}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:420,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Nueva Cotización</div><div style={{fontSize:11,color:"var(--t3)"}}>{lead.co}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"20px"}}>
          <div style={{background:"var(--hv)",borderRadius:"var(--r)",padding:"14px",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Empresa",lead.co],["Contacto",lead.ct],["Valor referencial","USD "+new Intl.NumberFormat("es-PE").format(lead.val)],["Probabilidad",lead.prob+"%"],["Sector",lead.sec],["Etapa",lead.stage]].map(([k,v],i)=>(
                <div key={i}><div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginBottom:1}}>{k}</div><div style={{fontSize:12,color:"var(--t1)",fontWeight:600}}>{v}</div></div>
              ))}
            </div>
          </div>
          <div style={{fontSize:12,color:"var(--t2)",marginBottom:16}}>Los datos del cliente se pre-cargarán en la Calculadora de Rentabilidad para generar la cotización.</div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button className="btn btn-s btn-sm" onClick={onClose}>Cancelar</button>
            <button className="btn btn-p btn-sm" onClick={()=>{toast("Abriendo calculadora con datos del cliente…","success");onNav("rentabilidad", lead.id);onClose();}}>{I.prf} Ir a Calculadora</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CRM({leads,setLeads,toast,usuario,onNav,cotizaciones,setCotizaciones,onTourAction}) {
  // -- Filtro de visibilidad por rol --------------------------------------
  const esAdmin = ["Admin","Gerencia","Jefe Proyecto","Finanzas"].includes(usuario?.rol);
  const miLeads = (obj) => {
    if(esAdmin) return obj; // Admin, Gerencia y Jefe Proyecto ven todo
    // Comercial: solo sus leads. Sin fallback — evita duplicación al mover
    const filtered = {};
    Object.entries(obj).forEach(([stage,arr])=>{
      filtered[stage] = arr.filter(l=> !l.exec || l.exec===usuario?.nombre);
    });
    return filtered;
  };
  const leadsVisibles = miLeads(leads);

  // ── DEDUPLICAR: una sola instancia por ID en todo el sistema ──
  // Convierte {etapa: [leads]} → array plano único por ID (último stage gana)
  const deduplicar = (obj) => {
    const mapa = {};
    Object.entries(obj||{}).forEach(([stage, arr]) => {
      (arr||[]).forEach(l => { mapa[l.id] = {...l, stage}; });
    });
    return Object.values(mapa);
  };

  // Reconstruir objeto {etapa:[]} desde array plano (para mantener compatibilidad)
  const aObjEtapas = (arr) => {
    const obj = {prospecto:[],calificado:[],propuesta:[],negociacion:[],ganado:[]};
    (arr||[]).forEach(l => {
      const s = (l.stage||'prospecto').toLowerCase().trim();
      if(!obj[s]) obj[s] = [];
      obj[s].push(l);
    });
    return obj;
  };

  // Fuente única deduplicada para el Kanban
  const leadsFlat    = deduplicar(leadsVisibles);
  const leadsAllFlat = deduplicar(leads);  // para contadores sin filtro de usuario
  // == Filtro temporal CRM ==
  const [anioSel,setAnioSel] = useState(new Date().getFullYear());
  const [periodoSel,setPeriodoSel] = useState("anual"); // anual | q1 | q2 | q3 | q4 | h1 | h2

  // Años disponibles (de los leads existentes)
  const aniosDisp = [...new Set(
    Object.values(leadsVisibles).flat()
      .map(l=> l.last ? new Date(l.last).getFullYear() : new Date().getFullYear())
  )].sort((a,b)=>b-a);
  if(!aniosDisp.includes(anioSel)) aniosDisp.push(anioSel);

  // Función: ¿está el lead en el periodo seleccionado?
  const enPeriodo = (lead) => {
    // Si el período es anual, mostrar todos los leads sin filtrar por fecha
    if(periodoSel==="anual") return true;
    // Para filtros de período, necesitamos fecha válida
    if(!lead.last) return true; // sin fecha → incluir siempre
    const d = new Date(lead.last);
    if(isNaN(d.getTime())) return true; // fecha inválida → incluir siempre
    if(d.getFullYear() !== anioSel) return false;
    const m = d.getMonth(); // 0-11
    if(periodoSel==="q1") return m<=2;
    if(periodoSel==="q2") return m>=3&&m<=5;
    if(periodoSel==="q3") return m>=6&&m<=8;
    if(periodoSel==="q4") return m>=9;
    if(periodoSel==="h1") return m<=5;
    if(periodoSel==="h2") return m>=6;
    return true;
  };

  const [sel,setSel]=useState(null);
  const [view,setView]=useState("kanban");
  const [modalLead,setModalLead]=useState(false);
  const [modalAct,setModalAct]=useState(false);
  const [modalCot,setModalCot]=useState(false);
  const [modalFollowUp,setModalFollowUp]=useState(false);
  const [tabCRM,setTabCRM]=useState("pipeline");
  const [dragLead,setDragLead]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [secuencias,setSecuencias]=useState(SECUENCIAS_INIT);

  // Motor temperatura automático — recalcula al montar
  useEffect(()=>{
    const HOY=Date.now();
    const LOCK=24*60*60*1000;
    setLeads(prev=>{
      let changed=false;
      const nxt={};
      Object.entries(prev).forEach(([stage,arr])=>{
        nxt[stage]=arr.map(l=>{
          if(l.tempLocked&&l.tempTs&&(HOY-l.tempTs)<LOCK) return l;
          const dias=Math.ceil((HOY-new Date(l.last).getTime())/(864e5));
          const t=dias<=1?"HOT":dias<=5?"WARM":"COLD";
          if(t===l.temp) return l;
          changed=true;
          return {...l,temp:t,tempLocked:false};
        });
      });
      if(!changed) return prev;
      // Deduplicar antes de guardar — evitar leads en múltiples etapas
      const flat2 = Object.values(nxt).flat();
      const uniq2 = Object.values(flat2.reduce((m,l)=>({...m,[l.id]:l}),{}));
      return aObjEtapas(uniq2);
    });
  },[]);

  const allLeads=leadsFlat.filter(enPeriodo);
  const total=allLeads.filter(l=>l.stage!=="ganado").reduce((a,b)=>a+b.val,0);
  const canEdit=["Admin","Comercial"].includes(usuario.rol);
  const sc={urgent:C.red,action:C.blue,info:C.amber,auto:C.teal};

  const suggs=lead=>{
    const s=[];
    if(lead.score>=80&&lead.stage==="propuesta")s.push({t:"urgent",l:"Urgente",tx:"Seguimiento en 24h — propuesta de alto valor."});
    if(lead.stage==="calificado")s.push({t:"action",l:"Siguiente",tx:"Preparar propuesta económica personalizada."});
    if(lead.stage==="negociacion")s.push({t:"urgent",l:"Negociación",tx:"Revisar cláusulas contractuales con legal."});
    s.push({t:"auto",l:"IA",tx:`Sector ${lead.sec}: cierre ~45d. Demo SITIA recomendado.`});
    return s;
  };

  const registrarActividad=(lead)=>{
    const act={t:"call",tx:"Seguimiento registrado — "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"}),d:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"}),u:usuario.avatar};
    const updated={...lead,last:"2026-04-02",acts:[act,...(lead.acts||[]).slice(0,4)]};
    setLeads(prev=>{
      const flat = Object.values(prev).flat();
      const uniq = Object.values(flat.reduce((m,l)=>({...m,[l.id]:l}),{}));
      return aObjEtapas(uniq.map(l=>l.id===lead.id?updated:l));
    });
    setSel(updated);
    toast("✓ Actividad registrada y guardada","success");
  };

  const STAGE_TO_COT={prospecto:"prospecto",calificado:"calificado",propuesta:"propuesta",negociacion:"negociacion",ganado:"ganado"};
  const moverEtapa=(lead,nuevaEtapa)=>{
    const leadId = lead.id;
    setLeads(prev=>{
      // Array plano deduplicado — fuente única de verdad
      const flat = Object.values(prev).flat();
      const uniq = Object.values(flat.reduce((m,l)=>({...m,[l.id]:l}),{}));
      const leadActual = uniq.find(l=>l.id===leadId);
      if(!leadActual) return prev;
      if(leadActual.stage===nuevaEtapa) return prev;
      // Actualizar stage y reconstruir objeto
      const updatedFlat = uniq.map(l=>l.id===leadId ? {...l,stage:nuevaEtapa} : l);
      const moved = updatedFlat.find(l=>l.id===leadId);
      setTimeout(()=>setSel(moved),0);
      return aObjEtapas(updatedFlat);
    });
    // Sincronizar estado de cotización vinculada (por leadId o por nombre cliente)
    if(setCotizaciones){
      const estCot = STAGE_TO_COT[nuevaEtapa]||nuevaEtapa;
      setCotizaciones(prev=>prev.map(c=>{
        const matchId     = c.leadId && c.leadId===lead.id;
        const matchCliente= !c.leadId && c.cliente&&lead.co &&
          (c.cliente.toLowerCase().includes(lead.co.toLowerCase().split(" ")[0]) ||
           lead.co.toLowerCase().includes(c.cliente.toLowerCase().split(" ")[0]));
        return (matchId||matchCliente) ? {...c, estado:estCot, leadId:lead.id} : c;
      }));
    }
    if(nuevaEtapa==="ganado"&&setCotizaciones){
      const yaExiste=(cotizaciones||[]).some(c=>c.leadId===lead.id);
      if(!yaExiste){
        const nuevaCot={
          id:"COT-"+new Date().getFullYear()+"-L"+lead.id.replace("L","").padStart(3,"0"),
          leadId:lead.id,
          cliente:lead.co,
          contacto:lead.ct,
          cargo:lead.rol||"—",
          email:lead.email||"—",
          proyecto:"Servicio para "+lead.co,
          servicio:lead.tags?.[0]||"Inventario de Activo Fijo",
          venta:lead.val||0,
          valor:lead.val||0,
          costo:0, margen:0,
          estado:"calificado",
          autor:usuario.nombre,
          fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),
          cuotas:4, personal:[], sector:lead.sec||"—",
          notas:lead.notes||"", tags:lead.tags||[],
        };
        setCotizaciones(prev=>[nuevaCot,...(prev||[])]);
        toast("Ganado! Cotizacion "+nuevaCot.id+" creada en borrador","success");
      }
    }
    toast(`Lead movido a ${STAGES.find(s=>s.id===nuevaEtapa)?.lbl}`,"success");
  };

  return (
    <div>
      {/* -- MODALES -- */}
      {modalLead&&<ModalNuevoLead onClose={()=>setModalLead(false)} onSave={lead=>{
        setLeads(prev=>{ const flat=Object.values(prev).flat(); const uniq=Object.values(flat.reduce((m,l)=>({...m,[l.id]:l}),{})); return aObjEtapas([...uniq.filter(l=>l.id!==lead.id), lead]); });
        setModalLead(false);
        toast("✓ Lead creado: "+lead.co,"success");
        if(lead.stage==="calificado"||lead.stage==="propuesta"||lead.stage==="negociacion"){
          setTimeout(()=>toast("💰 ¿Cotizar ahora? → Ve a Rentabilidad","info"),800);
        }
        if(onTourAction) onTourAction();
      }} usuario={usuario}/>}
      {modalAct&&sel&&<ModalActividad lead={sel} onClose={()=>setModalAct(false)} onSave={act=>{
        const hoy=new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});
        setLeads(prev=>{
          const nxt={...prev};
          const stage=sel.stage;
          nxt[stage]=nxt[stage].map(l=>{
            if(l.id!==sel.id) return l;
            // Motor de temperatura: actividad reciente → HOT automático
            const newTemp = !l.tempLocked ? "HOT" : l.temp;
            const updated={...l,
              acts:[{t:act.tipo,tx:act.nota,d:hoy,u:usuario.nombre},...(l.acts||[])],
              last:new Date().toISOString().split("T")[0],
              temp:newTemp,
              tempTs:Date.now(),
              tempLocked:false,
            };
            setSel(updated);
            return updated;
          });
          return nxt;
        });
        setModalAct(false);toast("Actividad registrada — lead actualizado a HOT 🔥","success");
      }} usuario={usuario}/>}
      {modalCot&&sel&&<ModalCotizacion lead={sel} onClose={()=>setModalCot(false)} onSave={cot=>{
        setCotizaciones&&setCotizaciones(prev=>[cot,...(prev||[])]);
        setModalCot(false);toast("Cotización creada","success");
      }} usuario={usuario} cotizaciones={cotizaciones}/>}
      {modalFollowUp&&sel&&<ModalFollowUp lead={sel} onClose={()=>setModalFollowUp(false)} onSave={()=>{
        setModalFollowUp(false);toast("Follow-up programado","success");
      }} usuario={usuario}/>}


      <div className="sh">
        <div><div className="st">CRM — Pipeline Comercial</div><div className="ss">Activo: <strong style={{color:C.blue,fontFamily:"var(--mono)"}}>{`$${fi(total)}`}</strong> · cambios guardados automáticamente · {anioSel} {periodoSel==="anual"?"Año completo":periodoSel==="h1"?"Ene–Jun":periodoSel==="h2"?"Jul–Dic":periodoSel.toUpperCase()}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {/* Selector de año */}
          <select value={anioSel} onChange={e=>setAnioSel(parseInt(e.target.value))}
            style={{fontSize:11,padding:"4px 8px",borderRadius:"var(--r)",
              border:"1px solid var(--bd)",background:"var(--card)",color:"var(--t1)",
              fontWeight:600,cursor:"pointer"}}>
            {aniosDisp.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {/* Selector de periodo */}
          <div style={{display:"flex",background:"var(--card)",border:"1px solid var(--bd)",
            borderRadius:"var(--r)",overflow:"hidden"}}>
            {[
              {v:"anual", l:"Año completo"},
              {v:"h1",    l:"Ene–Jun"},
              {v:"h2",    l:"Jul–Dic"},
              {v:"q1",    l:"Q1"},
              {v:"q2",    l:"Q2"},
              {v:"q3",    l:"Q3"},
              {v:"q4",    l:"Q4"},
            ].map(p=>(
              <button key={p.v} onClick={()=>setPeriodoSel(p.v)}
                style={{padding:"4px 10px",fontSize:10,fontWeight:600,border:"none",
                  cursor:"pointer",
                  background:periodoSel===p.v?C.navy:"transparent",
                  color:periodoSel===p.v?"white":"var(--t2)",
                  transition:"all .15s"}}>
                {p.l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)",overflow:"hidden"}}>
            {["pipeline","seguimiento"].map(v=><button key={v} onClick={()=>setTabCRM(v)} style={{padding:"5px 13px",fontSize:11,fontWeight:600,background:tabCRM===v?C.blue:"transparent",color:tabCRM===v?"#fff":"var(--t2)",border:"none",cursor:"pointer",transition:"all .15s"}}>{v==="pipeline"?"Pipeline":"Seguimiento"}</button>)}
          </div>
          {canEdit&&<button className="btn btn-p btn-sm" id="btn-nuevo-lead" data-tour="btn-nuevo-lead" onClick={()=>setModalLead(true)}>{I.plus} Nuevo Lead</button>}
          <button className="btn btn-s btn-sm" onClick={()=>{
            const rows=leadsFlat.filter(enPeriodo);
            const pipeVal=rows.filter(l=>l.stage!=="ganado").reduce((a,l)=>a+(l.val||0),0);
            const ganVal=rows.filter(l=>l.stage==="ganado").reduce((a,l)=>a+(l.val||0),0);
            const convRate=rows.length>0?Math.round(rows.filter(l=>l.stage==="ganado").length/rows.length*100):0;
            // Gráfica de barras por etapa
            const etapas=[["Prospecto","prospecto","#94a3b8"],["Calificado","calificado","#4a9fd4"],["Propuesta","propuesta","#BA7517"],["Negociación","negociacion","#9333ea"],["Ganado","ganado","#1D9E75"]];
            const maxE=Math.max(...etapas.map(([,s])=>(rows.filter(l=>l.stage===s).length||0)),1);
            let barSvg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="170" style="font-family:Segoe UI,sans-serif"><rect width="480" height="170" fill="#f8fafc" rx="6"/>';
            etapas.forEach(([lbl,s,col],i)=>{
              const n=rows.filter(l=>l.stage===s).length;
              const x=20+i*90,h=Math.max((n/maxE)*110,n>0?4:0);
              barSvg+='<rect x="'+x+'" y="'+(120-h)+'" width="72" height="'+h+'" fill="'+col+'" rx="3"/>';
              barSvg+='<text x="'+(x+36)+'" y="133" fill="#64748b" font-size="9" text-anchor="middle">'+lbl+'</text>';
              barSvg+='<text x="'+(x+36)+'" y="'+(120-h-5)+'" fill="'+col+'" font-size="12" font-weight="800" text-anchor="middle">'+n+'</text>';
            });
            barSvg+='</svg>';
            // Tabla de leads
            const tabLeads='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">ID</th><th style="padding:7px 10px;text-align:left">Cliente</th><th style="padding:7px 10px">Etapa</th><th style="padding:7px 10px;text-align:right">Valor USD</th><th style="padding:7px 10px;text-align:right">Prob%</th><th style="padding:7px 10px">Temperatura</th><th style="padding:7px 10px">Sector</th></tr>'+
              rows.slice(0,20).map((l,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-family:monospace;color:#4a9fd4;font-weight:700">'+l.id+'</td><td style="padding:6px 10px;font-weight:600">'+l.co+'</td><td style="padding:6px 10px;text-align:center"><span style="padding:2px 8px;border-radius:10px;font-size:10px;background:'+({'prospecto':'#e2e8f0','calificado':'rgba(74,159,212,.15)','propuesta':'rgba(186,117,23,.15)','negociacion':'rgba(147,51,234,.15)','ganado':'rgba(29,158,117,.15)'}[l.stage]||'#e2e8f0')+';color:'+({'prospecto':'#475569','calificado':'#4a9fd4','propuesta':'#BA7517','negociacion':'#9333ea','ganado':'#1D9E75'}[l.stage]||'#475569')+';font-weight:600">'+l.stage+'</span></td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">$'+fi(l.val||0)+'</td><td style="padding:6px 10px;text-align:right">'+(l.prob||0)+'%</td><td style="padding:6px 10px;text-align:center;font-weight:700;color:'+(l.temp==="HOT"?C.red:l.temp==="WARM"?C.amber:C.blue)+'">'+(l.temp||"WARM")+'</td><td style="padding:6px 10px;color:#64748b">'+l.sec+'</td></tr>').join('')+
              '</table>';
            generarPDFRico({
              nombre:"CRM_Pipeline_"+new Date().toLocaleDateString("es-PE").replace(/\//g,"-"),
              titulo:"Pipeline CRM",
              subtitulo:"Reporte Comercial · NEXOVA · "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}),
              kpis:[
                {label:"Total leads",     value:rows.length,               color:C.navy},
                {label:"Pipeline activo", value:"$"+fi(pipeVal),           color:C.blue},
                {label:"Valor ganado",    value:"$"+fi(ganVal),            color:C.teal},
                {label:"Tasa conversión", value:convRate+"%",              color:convRate>=30?C.teal:C.amber},
                {label:"Hot leads",       value:rows.filter(l=>l.temp==="HOT").length, color:C.red},
              ],
              secciones:[
                {titulo:"Distribución por Etapa del Pipeline", contenido:barSvg},
                {titulo:"Detalle de Leads (Top 20)",           contenido:tabLeads},
              ],
              analisis:{
                situacion:"Pipeline activo con <strong>"+rows.length+" leads</strong> y valor de <strong>USD "+fi(pipeVal)+"</strong>. Tasa de conversión: <strong>"+convRate+"%</strong>.",
                logros: ganVal>0?"Valor ganado en el período: <strong>USD "+fi(ganVal)+"</strong>.":undefined,
                riesgos: rows.filter(l=>l.temp==="COLD").length>0?"<strong>"+rows.filter(l=>l.temp==="COLD").length+" leads fríos</strong> detectados — requieren reactivación urgente.":undefined,
                recomendaciones:"<strong>1.</strong> Contactar a todos los leads HOT esta semana.<br/><strong>2.</strong> Calificar los "+((leads.prospecto||[]).length)+" leads en prospecto.<br/><strong>3.</strong> Preparar propuesta para leads en etapa Calificado.<br/><strong>4.</strong> Revisar leads sin actividad >7 días.",
              }
            });
            toast("✓ PDF del pipeline descargado","success");
          }}>{I.dl} PDF</button>
        </div>
      </div>

      {/* -- TAB PIPELINE -- */}
      {tabCRM==="pipeline"&&(
        <div>
          {/* Toggle Kanban/Tabla */}
          <div style={{display:"flex",background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)",overflow:"hidden",width:"fit-content",marginBottom:12}}>
            {["kanban","tabla"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"5px 13px",fontSize:11,fontWeight:600,background:view===v?C.navy:"transparent",color:view===v?"#fff":"var(--t2)",border:"none",cursor:"pointer"}}>{v==="kanban"?"Kanban":"Tabla"}</button>)}
          </div>

          {/* Tarjeta resumen leads */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14}}>
            {[
              {lbl:"Total leads",  v:leadsFlat.length, col:"#1E293B", bg:"var(--card)"},
              {lbl:"Prospecto",    v:leadsFlat.filter(l=>l.stage==="prospecto").length,        col:"#4a9fd4", bg:"rgba(74,159,212,.08)"},
              {lbl:"Calificado",   v:leadsFlat.filter(l=>l.stage==="calificado").length,       col:"#1E293B", bg:"rgba(30,41,59,.06)"},
              {lbl:"Propuesta",    v:leadsFlat.filter(l=>l.stage==="propuesta").length,        col:"#D97706", bg:"rgba(215,119,6,.08)"},
              {lbl:"Negociación",  v:leadsFlat.filter(l=>l.stage==="negociacion").length,      col:"#9333ea", bg:"rgba(147,51,234,.08)"},
              {lbl:"Ganados",      v:leadsFlat.filter(l=>l.stage==="ganado").length,           col:"#0D9488", bg:"rgba(13,148,136,.08)"},
            ].map((k,i)=>(
              <div key={i} style={{background:k.bg,border:"1px solid var(--bd)",borderRadius:"var(--r)",padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:800,color:k.col,fontFamily:"var(--mono)"}}>{k.v}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:2,fontWeight:600}}>{k.lbl}</div>
              </div>
            ))}
          </div>

          {/* Kanban + Panel lateral */}
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{flex:1,overflow:"hidden"}}>
              {view==="kanban"&&(
                <div className="kb">
                  {STAGES.map(stage=>{
                    const stageleads=leadsFlat.filter(l=>(l.stage||"").toLowerCase().trim()===stage.id).filter(enPeriodo);
                    const tot=stageleads.reduce((a,b)=>a+b.val,0);
                    return(
                      <div key={stage.id} id={"kanban-col-"+stage.id} data-tour={"kanban-col-"+stage.id} className="kcol"
                        onDragOver={e=>{e.preventDefault();setDragOver(stage.id);}}
                        onDragLeave={()=>setDragOver(null)}
                        onDrop={e=>{e.preventDefault();e.stopPropagation();if(dragLead){moverEtapa(dragLead,stage.id);toast("Lead movido a "+stage.lbl,"success");}setDragLead(null);setDragOver(null);}}
                        style={{transition:"background .15s",background:dragOver===stage.id?"rgba(13,148,136,.06)":"transparent",borderRadius:8}}>
                        <div style={{height:3,background:stage.color}}/>
                        <div className="kcol-hd"><div><div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{stage.lbl}</div>{tot>0&&<div className="mono" style={{fontSize:10,color:"var(--t3)"}}>{"$"+fi(tot)}</div>}</div><span className="kcol-cnt">{stageleads.length}</span></div>
                        <div className="kcards">
                          {stageleads.map(lead=>(
                            <div key={lead.id} className={`kcard${sel&&sel.id===lead.id?" sel":""}${dragLead?.id===lead.id?" dragging":""}`}
                            draggable={true}
                            onDragStart={e=>{setDragLead(lead);e.dataTransfer.effectAllowed="move";}}
                            onDragEnd={()=>{setDragLead(null);setDragOver(null);}}
                            onClick={()=>setSel(lead)}
                            style={{cursor:"grab",opacity:dragLead?.id===lead.id?0.5:1,transition:"opacity .15s",borderLeft:`3px solid ${lead.temp==="HOT"?"#E24B4A":lead.temp==="COLD"?"#4a9fd4":"#BA7517"}`}}>
                              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:2}}>{lead.co}</div>
                              <div style={{fontSize:11,color:"var(--t2)",marginBottom:7}}>{lead.ct}</div>
                              <div className="mono" style={{fontSize:13,fontWeight:700,color:C.navy}}>{"$"+fi(lead.val)}</div>
                              <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                                <span className={`kc-sc ${scCls(lead.score)}`}>{scLbl(lead.score)}</span>
                                <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:3,
                                  background:lead.temp==="HOT"?"rgba(226,75,74,.12)":lead.temp==="COLD"?"rgba(74,159,212,.12)":"rgba(186,117,23,.12)",
                                  color:lead.temp==="HOT"?"#E24B4A":lead.temp==="COLD"?"#4a9fd4":"#BA7517"
                                }}>{lead.temp==="HOT"?"🔥":lead.temp==="COLD"?"❄️":"🟡"}{lead.temp||"WARM"}</span>
                              </div>
                              <div style={{marginTop:7}}><PBar pct={lead.prob} color={lead.prob>70?C.teal:lead.prob>50?C.amber:C.blue} height={3}/></div>
                              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                                <span style={{fontSize:10,color:"var(--t3)"}}>{lead.prob}%</span>
                                <span style={{fontSize:10,color:"var(--t3)"}}>{fmtFecha(lead.last)}</span>
                              </div>
                            </div>
                          ))}
                          {stageleads.length===0&&<div style={{textAlign:"center",padding:"20px 8px",color:"var(--t3)",fontSize:11}}>Sin leads</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {view==="tabla"&&(
                <div className="card" style={{overflowX:"auto"}}>
                  <table>
                    <thead><tr><th>ID</th><th>Empresa</th><th>Valor</th><th>Etapa</th><th>Score</th><th>Prob.</th><th>Sector</th><th></th></tr></thead>
                    <tbody>
                      {allLeads.map(lead=>{
                        const st=STAGES.find(s=>s.id===lead.stage)||STAGES[0];
                        return(
                          <tr key={lead.id} onClick={()=>setSel(lead)} style={{cursor:"pointer"}}>
                            <td className="mono" style={{fontSize:11,color:C.blue,fontWeight:700}}>{lead.id}</td>
                            <td><strong>{lead.co}</strong></td>
                            <td className="mono" style={{fontWeight:700}}>{"$"+fi(lead.val)}</td>
                            <td><span className={`pill ${st.pill}`}>{st.lbl}</span></td>
                            <td><span className={`kc-sc ${scCls(lead.score)}`}>{lead.score}</span></td>
                            <td className="mono">{lead.prob}%</td>
                            <td>{lead.sec}</td>
                            <td onClick={e=>e.stopPropagation()}>
                              <button className="btn btn-r btn-xs" style={{fontSize:10}}
                                onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar lead "+lead.co+"?"))setLeads(prev=>{const nxt={...prev};nxt[lead.stage]=nxt[lead.stage].filter(l=>l.id!==lead.id);return nxt;});}}>
                                🗑
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{width:285,flexShrink:0}}>
              {sel?(
                <div className="lp">
                  <div className="lp-hd">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                      <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>{sel.co}</div><div style={{fontSize:11,color:"var(--t2)",marginTop:2}}>{sel.ct}</div></div>
                      <ScoreRing score={sel.score}/>
                    </div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                      <span className={`pill ${STAGES.find(s=>s.id===sel.stage)?.pill||"blue"}`}>{STAGES.find(s=>s.id===sel.stage)?.lbl}</span>
                      {(sel.tags||[]).map((tg,i)=><span key={i} style={{fontSize:10,padding:"1px 6px",borderRadius:3,background:"var(--hv)",color:"var(--t2)"}}>{tg}</span>)}
                    </div>
                    {/* Control temperatura */}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:"var(--t3)",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                        🌡️ Temperatura
                        {sel.tempLocked&&<span style={{fontSize:9,color:"#BA7517"}}>🔒 manual</span>}
                        
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        {[{v:"HOT",lbl:"🔥 HOT",col:"#E24B4A"},{v:"WARM",lbl:"🟡 WARM",col:"#BA7517"},{v:"COLD",lbl:"❄️ COLD",col:"#4a9fd4"}].map(t=>(
                          <button key={t.v} onClick={()=>{
                            const updated={...sel,temp:t.v,tempLocked:true,tempTs:Date.now()};
                            setLeads(prev=>{
                              const nxt={...prev};
                              nxt[sel.stage]=nxt[sel.stage].map(l=>l.id===sel.id?updated:l);
                              return nxt;
                            });
                            setSel(updated);
                            toast("Temperatura cambiada a "+t.v+" 🔒 (manual, 24h)","success");
                          }}
                          style={{flex:1,padding:"4px 2px",border:`2px solid ${sel.temp===t.v?t.col:"var(--bd)"}`,
                            borderRadius:6,background:sel.temp===t.v?t.col+"20":"transparent",
                            color:sel.temp===t.v?t.col:"var(--t3)",fontSize:10,fontWeight:700,
                            cursor:"pointer",transition:"all .15s"}}>
                            {t.lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:"8px 10px",background:"var(--hv)",borderRadius:"var(--r)",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"var(--t3)"}}>Valor</span>
                      <span className="mono" style={{fontSize:16,fontWeight:800,color:C.blue}}>{"$"+fi(sel.val)}</span>
                    </div>
                  </div>
                  <div className="lp-body">
                    <div className="lp-sec">
                      <div className="lp-st">Probabilidad de cierre</div>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><div style={{flex:1}}><PBar pct={sel.prob} color={sel.prob>70?C.teal:sel.prob>50?C.amber:C.blue}/></div><span className="mono" style={{fontSize:13,fontWeight:700}}>{sel.prob}%</span></div>
                      <div style={{fontSize:11,color:"var(--t3)"}}>Última actividad: {fmtFecha(sel.last)}</div>
                    </div>
                    {canEdit&&(
                      <div className="lp-sec">
                        <div className="lp-st">Mover a etapa</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                          {STAGES.filter(s=>s.id!==sel.stage).map(s=>(
                            <button key={s.id} onClick={()=>moverEtapa(sel,s.id)} className="btn btn-s btn-xs" style={{fontSize:10}}>{s.lbl}</button>
                          ))}
                        </div>
                        <div style={{fontSize:10,color:"var(--t3)",lineHeight:1.6,background:"var(--hv)",borderRadius:6,padding:"6px 8px"}}>
                          {[
                            {s:"prospecto",  d:"Contacto inicial identificado"},
                            {s:"calificado", d:"Tiene presupuesto, autoridad y necesidad"},
                            {s:"propuesta",  d:"Propuesta económica enviada"},
                            {s:"negociacion",d:"Ajustando términos y condiciones"},
                            {s:"ganado",     d:"Contrato firmado ✅"},
                          ].find(e=>e.s===sel.stage)?.d||""}
                        </div>
                      </div>
                    )}
                    <div className="lp-sec">
                      <div className="lp-st" style={{display:"flex",alignItems:"center",gap:5}}>{I.zap} Acciones IA</div>
                      {suggs(sel).map((s,i)=>(
                        <div key={i} className="as" onClick={()=>toast("Acción: "+s.l,"success")}>
                          <div style={{width:16,height:16,borderRadius:3,background:sc[s.t]+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:sc[s.t],fontSize:8}}>●</span></div>
                          <div><div style={{fontSize:10,fontWeight:700,color:sc[s.t],marginBottom:2}}>{s.l}</div><div style={{fontSize:11,color:"var(--t1)",lineHeight:1.4}}>{s.tx}</div></div>
                        </div>
                      ))}
                    </div>
                    <div className="lp-sec">
                      <div className="lp-st">Historial de actividad</div>
                      {(sel.acts||[]).map((a,i)=>(
                        <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                          <div style={{width:20,height:20,borderRadius:"50%",background:C.blue+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:9,fontWeight:700,color:C.blue}}>{a.t==="call"?"C":a.t==="mail"?"E":a.t==="meeting"?"R":"✓"}</div>
                          <div><div style={{fontSize:11,color:"var(--t1)",lineHeight:1.4}}>{a.tx}</div><div className="mono" style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{a.d}·{a.u}</div></div>
                        </div>
                      ))}
                    </div>
                    {sel.notes&&<div className="lp-sec"><div className="lp-st">Notas</div><div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5,fontStyle:"italic"}}>"{sel.notes}"</div></div>}
                    {canEdit&&(
                      <div style={{padding:"10px 14px",display:"flex",gap:6,flexWrap:"wrap"}}>
                        <button className="btn btn-p btn-sm" onClick={()=>setModalAct(true)}>{I.plus} Actividad</button>
                        <button className="btn btn-s btn-sm" onClick={()=>sel.stage!=="ganado"?onNav("rentabilidad",sel.id):onNav("rentabilidad",sel.id)}>{sel.stage==="ganado"?"✅ Ver cotización":"💰 Cotizar"}</button>
                        <button className="btn btn-s btn-sm" onClick={()=>setModalFollowUp(true)}>{I.mail} Follow-up</button>
                      </div>
                    )}
                  </div>
                </div>
              ):(
                <div style={{textAlign:"center",padding:40,color:"var(--t3)",fontSize:12,background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)"}}>← Selecciona un lead</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- TAB SEGUIMIENTO -- */}
      {tabCRM==="seguimiento"&&(
        <div>
          {/* KPIs de acción */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {(()=>{
              const hoy = new Date("2026-04-05");
              const todos = Object.values(leads).flat();
              const sinAct7  = todos.filter(l=>l.stage!=="ganado"&&Math.ceil((hoy-new Date(l.last))/(864e5))>=7);
              const sinAct3  = todos.filter(l=>l.stage!=="ganado"&&Math.ceil((hoy-new Date(l.last))/(864e5))>=3&&Math.ceil((hoy-new Date(l.last))/(864e5))<7);
              const hot      = todos.filter(l=>l.temp==="HOT"&&l.stage!=="ganado");
              const alta     = todos.filter(l=>l.prob>=70&&l.stage!=="ganado");
              return [
                {l:"Sin actividad +7d", v:sinAct7.length,  col:"red"},
                {l:"Sin actividad 3-7d",v:sinAct3.length,  col:"amber"},
                {l:"Leads HOT 🔥",      v:hot.length,      col:"red"},
                {l:"Alta prob. (≥70%)", v:alta.length,     col:"teal"},
              ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>);
            })()}
          </div>

          {/* Filtro */}
          {(()=>{
            const hoy = new Date("2026-04-05");
            const todos = Object.values(leads).flat().filter(l=>l.stage!=="ganado");
            const urgentes = todos.map(l=>({
              ...l,
              diasSinAct: Math.ceil((hoy-new Date(l.last))/(864e5)),
              urgencia: l.temp==="HOT"&&Math.ceil((hoy-new Date(l.last))/(864e5))>=3?"CRITICO":
                        Math.ceil((hoy-new Date(l.last))/(864e5))>=7?"ALTO":
                        l.temp==="HOT"||Math.ceil((hoy-new Date(l.last))/(864e5))>=5?"MEDIO":"BAJO"
            })).filter(l=>l.diasSinAct>=2||l.temp==="HOT")
              .sort((a,b)=>{
                const ord={CRITICO:0,ALTO:1,MEDIO:2,BAJO:3};
                return (ord[a.urgencia]||3)-(ord[b.urgencia]||3);
              });

            if(urgentes.length===0) return (
              <div style={{textAlign:"center",padding:48,color:"var(--t3)",background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)"}}>
                ✅ Sin leads pendientes de seguimiento
              </div>
            );

            return (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {urgentes.map((lead,i)=>{
                  const st = STAGES.find(s=>s.id===lead.stage)||STAGES[0];
                  const urgCol = {CRITICO:"#E24B4A",ALTO:"#BA7517",MEDIO:"#4a9fd4",BAJO:"#64748b"};
                  const urgBg  = {CRITICO:"rgba(226,75,74,.08)",ALTO:"rgba(186,117,23,.08)",MEDIO:"rgba(74,159,212,.08)",BAJO:"rgba(100,116,139,.06)"};
                  return(
                    <div key={i} style={{background:"var(--card)",border:`1px solid ${urgCol[lead.urgencia]}30`,
                      borderLeft:`4px solid ${urgCol[lead.urgencia]}`,borderRadius:"var(--r)",
                      padding:"12px 16px",cursor:"pointer"}}
                      onClick={()=>{setSel(lead);setTabCRM("pipeline");}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                            <span style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{lead.co}</span>
                            <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:3,
                              background:lead.temp==="HOT"?"rgba(226,75,74,.12)":lead.temp==="COLD"?"rgba(74,159,212,.12)":"rgba(186,117,23,.12)",
                              color:lead.temp==="HOT"?"#E24B4A":lead.temp==="COLD"?"#4a9fd4":"#BA7517"}}>
                              {lead.temp==="HOT"?"🔥 HOT":lead.temp==="COLD"?"❄️ COLD":"🟡 WARM"}
                            </span>
                            <span className={`pill ${st.pill}`} style={{fontSize:9}}>{st.lbl}</span>
                          </div>
                          <div style={{fontSize:11,color:"var(--t3)",marginBottom:6}}>{lead.ct} · {lead.sec}</div>
                          <div style={{display:"flex",gap:16,fontSize:11}}>
                            <span style={{color:"var(--t2)"}}>💰 <strong className="mono">${(lead.val||0).toLocaleString("es-PE")}</strong></span>
                            <span style={{color:"var(--t2)"}}>📊 <strong>{lead.prob}%</strong> prob.</span>
                            <span style={{color:lead.diasSinAct>=7?"#E24B4A":lead.diasSinAct>=3?"#BA7517":"var(--t3)"}}>
                              🕐 <strong>{lead.diasSinAct}d</strong> sin actividad
                            </span>
                          </div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                          <div style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,
                            background:urgBg[lead.urgencia],color:urgCol[lead.urgencia],marginBottom:6}}>
                            {lead.urgencia}
                          </div>
                          <button className="btn btn-p btn-xs" style={{fontSize:10}}
                            onClick={e=>{e.stopPropagation();setModalAct(true);setSel(lead);}}>
                            + Actividad
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}



const TARIFAS_OFICIALES = [
  {id:"T01", cargo:"Gerente General",          soles:137.11, usd:38.09},
  {id:"T02", cargo:"Gerente",                  soles:99.68,  usd:27.69},
  {id:"T03", cargo:"Sub Gerente de Sistemas",  soles:79.00,  usd:21.94},
  {id:"T04", cargo:"Tributarista / NIF",        soles:79.00,  usd:21.94},
  {id:"T05", cargo:"Subgerente",               soles:57.79,  usd:16.05},
  {id:"T06", cargo:"Jefe de Proyecto",         soles:40.51,  usd:11.25},
  {id:"T07", cargo:"Perito Tasador",           soles:77.64,  usd:21.57},
  {id:"T08", cargo:"Supervisor de Perito",     soles:37.98,  usd:10.55},
  {id:"T09", cargo:"Consultor de Sistemas",    soles:37.98,  usd:10.55},
  {id:"T10", cargo:"Jefe Soporte",             soles:29.49,  usd:8.19},
  {id:"T11", cargo:"Coordinador SIG",          soles:33.73,  usd:9.37},
  {id:"T12", cargo:"Ingeniero Petrolero",      soles:75.02,  usd:20.84},
  {id:"T13", cargo:"Consultor Funcional",      soles:26.66,  usd:7.40},
  {id:"T14", cargo:"Consultor Contable",       soles:26.66,  usd:7.40},
  {id:"T15", cargo:"Supervisor de Inventario", soles:17.03,  usd:4.73},
  {id:"T16", cargo:"Asistente Contable",       soles:17.03,  usd:4.73},
  {id:"T17", cargo:"Estibador",                soles:18.98,  usd:5.27},
  {id:"T18", cargo:"Asistente de Inventario",  soles:13.46,  usd:3.74},
  {id:"T19", cargo:"Archivador / Fotocopista", soles:13.46,  usd:3.74},
];

const EPP_ITEMS_DEFAULT = [
  {id:"E01", desc:"Laptop — Mensual",                        usd:50.00,  unidad:"mes"},
  {id:"E02", desc:"Laptop — Diario",                         usd:6.94,   unidad:"día"},
  {id:"E03", desc:"Impresora + Kit de Tintas — Mensual",     usd:55.56,  unidad:"mes"},
  {id:"E04", desc:"Internet — Mensual",                      usd:27.78,  unidad:"mes"},
  {id:"E05", desc:"Terminal — Diario",                       usd:5.25,   unidad:"día"},
  {id:"E06", desc:"Tarjeta de Inventario — Millar",          usd:13.89,  unidad:"millar"},
  {id:"E07", desc:"Etiquetas Impresas + Protector — Millar", usd:20.00,  unidad:"millar"},
  {id:"E08", desc:"Kit Inventario (lapicero, wincha, tablero)",usd:2.47,  unidad:"kit"},
  {id:"E09", desc:"EPP Lima (casco+botas+chaleco+lentes)",   usd:9.72,   unidad:"persona"},
  {id:"E10", desc:"EPP Mina (Lima+mameluco+tapones+filtros+guantes+botas+lentes)",usd:44.44,unidad:"persona"},
  {id:"E11", desc:"Útiles de Oficina",                       usd:41.67,  unidad:"global"},
  {id:"E12", desc:"Examen Médico Ocupacional",               usd:33.33,  unidad:"persona"},
  {id:"E13", desc:"Examen Médico Tipo 16",                   usd:125.00, unidad:"persona"},
  {id:"E14", desc:"Trabajo en Altura (examen+capacitación)", usd:61.11,  unidad:"persona"},
  {id:"E15", desc:"Arnés de Seguridad + Línea de Vida",      usd:50.00,  unidad:"persona"},
  {id:"E16", desc:"Vacuna Fiebre Amarilla",                  usd:69.44,  unidad:"persona"},
  {id:"E17", desc:"Vacuna Tétano",                           usd:69.44,  unidad:"persona"},
];

const GASTOS_DEFAULT = [
  {id:"G01", desc:"Movilidad / Transporte",      usd:0},
  {id:"G02", desc:"Alojamiento",                 usd:0},
  {id:"G03", desc:"Alimentación",                usd:0},
  {id:"G04", desc:"Viáticos campo",              usd:0},
  {id:"G05", desc:"Flete / Envío de equipos",    usd:0},
  {id:"G06", desc:"Comunicaciones",              usd:0},
];

const MARGENES = { admin:0.04, ventas:0.015, marketing:0.015, minimo:0.30 };



function calcCot(personal,gastos,epp,margenObj,desc,tc){
  const costP=personal.reduce((a,p)=>a+(p.cant*p.horas*p.tarifa),0);
  const costG=gastos.reduce((a,g)=>a+(g.mon==="USD"?g.monto:g.monto/tc),0);
  const costE=epp.reduce((a,e)=>a+(e.cant*e.precio),0);
  const sub=costP+costG+costE;
  const costT=sub*1.04;
  const dVal=costT*(desc/100);
  const neto=costT-dVal;
  const venta=neto/(1-margenObj/100);
  const margen=((venta-neto)/venta)*100;
  const horas=personal.reduce((a,p)=>a+(p.cant*p.horas),0);
  return {costP,costG,costE,sub,costT,dVal,neto,venta,margen,horas};
}


function Rentabilidad({leads,cotizaciones,setCotizaciones,toast,usuario,tarifas:tarifasGlobal,setTarifas:setTarifasGlobal,sysConfig,navLeadId,onClearNavLead,onTourAction}) {
  const isAdmin = usuario.rol==="Admin";
  const [tab,setTab]       = useState("lista");
  const [selCot,setSelCot]       = useState(null);
  const [editandoCotId,setEditandoCotId] = useState(null); // null=nueva, id=editar

  // Tarifas: Admin puede editar, demás solo leen
  const [tarifasLocal, setTarifasLocal] = useState(null);
  const tarifas = tarifasLocal || (tarifasGlobal && tarifasGlobal.length>0 ? tarifasGlobal : TARIFAS_OFICIALES);
  const setTarifas = (fn) => {
    const next = typeof fn==="function" ? fn(tarifas) : fn;
    setTarifasLocal(next);
  };
  // Sincronizar si cambian las tarifas globales externamente
  React.useEffect(()=>{ if(tarifasGlobal&&tarifasGlobal.length>0) setTarifasLocal(null); },[tarifasGlobal]);

  // Calculadora
  const [cliente,setCliente]   = useState("");
  const [leadSelId,setLeadSelId]= useState("");

  const [servicio,setServicio] = useState(SERVICIOS_AQUARIUS[0].nombre);
  const [moneda,setMoneda]     = useState("USD");
  const [personal,setPersonal] = useState([
    {id:1,cargo:"Jefe de Proyecto",cant:1,horas:24,tarifa:11.25,custom:false},
    {id:2,cargo:"Consultor Funcional",cant:1,horas:132,tarifa:7.40,custom:false},
    {id:3,cargo:"Supervisor de Inventario",cant:1,horas:176,tarifa:4.73,custom:false},
    {id:4,cargo:"Asistente Contable",cant:1,horas:160,tarifa:4.73,custom:false},
    {id:5,cargo:"Asistente de Inventario",cant:12,horas:1800,tarifa:3.74,custom:false},
  ]);
  const [eppRows,setEppRows]   = useState([
    {id:1,desc:"EPP Mina (casco+botas+chaleco+lentes+mameluco)",cant:14,precio:44.44,custom:false},
    {id:2,desc:"Etiquetas Impresas + Protector — Millar",cant:6,precio:20.00,custom:false},
  ]);
  const [gastos,setGastos]     = useState([
    {id:1,desc:"Internet",usd:80},
    {id:2,desc:"Examen Médico Ocupacional",usd:1750},
    {id:3,desc:"Vacuna Fiebre Amarilla",usd:1656},
    {id:4,desc:"Movilidad / Transporte",usd:400},
  ]);
  const [margenObj,setMargenObj] = useState(sysConfig?.margenObj||30);
  const [cuotas,setCuotas]           = useState(4);
  const [plazo,setPlazo]             = useState("9 semanas");
  const [activosPres,setActivosPres] = useState(0);      // activos presupuestados
  const [costoAdicMode,setCostoAdicMode] = useState("estandar"); // "estandar"|"calculado"|"manual"
  const [costoAdicManual,setCostoAdicManual] = useState(2.00);  // USD por activo adicional
  const [modalTarifas,setModalTarifas] = useState(false);
  const [sortCot,setSortCot] = useState({col:"fecha",dir:"desc"});
  const sortBy = (col) => setSortCot(s=>({col,dir:s.col===col&&s.dir==="asc"?"desc":"asc"}));
  const [aiAnalysis,setAiAnalysis]     = useState("");
  const [aiLoading,setAiLoading]       = useState(false);

  // Pre-cargar datos cuando se selecciona un lead
  const allLeads = Object.values(leads||{}).flat()
    .filter(l=> !l.exec || ["Admin","Gerencia","Jefe Proyecto"].includes(usuario?.rol) || l.exec===usuario?.nombre);
  const cargarDesdeLead = (id) => {
    // Caso especial: cliente de cotización sin lead
    if(id.startsWith("cot-")){
      const clienteNombre = id.replace("cot-","");
      const cotExistente = (cotizaciones||[]).filter(c=>c.cliente===clienteNombre).sort((a,b)=>b.fecha-a.fecha)[0];
      if(cotExistente){
        setCliente(cotExistente.cliente||clienteNombre);
        setServicio(cotExistente.servicio||cotExistente.proyecto||"");
        setPersonal(cotExistente.personal?.length>0?[...cotExistente.personal]:[]);
        setEppRows(cotExistente.epp?.length>0?[...cotExistente.epp]:[]);
        setGastos(cotExistente.gastos?.length>0?[...cotExistente.gastos]:[]);
        setMoneda(cotExistente.moneda||"USD");
        setCuotas(cotExistente.cuotas||4);
        setPlazo(cotExistente.plazo||"");
        setActivosPres(cotExistente.activosPresupuestados||0);
        if(cotExistente.margenObj) setMargenObj(cotExistente.margenObj);
        setLeadSelId("");
        setEditandoCotId(null);
        toast("✓ Datos de "+clienteNombre+" precargados desde cotización anterior","info");
      } else {
        setCliente(clienteNombre);
        setLeadSelId("");
        setEditandoCotId(null);
      }
      return;
    }
    const l = allLeads.find(x=>x.id===id);
    if(!l) return;
    // Buscar cotización existente vinculada a este lead
    const cotExistente = (cotizaciones||[]).find(c=>c.leadId===id || c.cliente===l.co);
    if(cotExistente){
      // Cargar TODOS los datos de la cotización existente
      setCliente(cotExistente.cliente||l.co||"");
      setServicio(cotExistente.servicio||cotExistente.proyecto||"");
      setPersonal(cotExistente.personal?.length>0 ? [...cotExistente.personal] : []);
      setEppRows(cotExistente.epp?.length>0 ? [...cotExistente.epp] : []);
      setGastos(cotExistente.gastos?.length>0 ? [...cotExistente.gastos] : []);
      setMoneda(cotExistente.moneda||"USD");
      setCuotas(cotExistente.cuotas||4);
      setPlazo(cotExistente.plazo||"");
      setActivosPres(cotExistente.activosPresupuestados||0);
      setLeadSelId(id);
      setEditandoCotId(cotExistente.id);
      toast("✓ Cotización "+cotExistente.id+" cargada — personal, EPP y gastos precargados","success");
    } else {
      // No hay cotización — precargar solo datos del lead
      setCliente(l.co||"");
      if(l.tags?.length) setServicio(l.tags[0]+" — "+l.co);
      setPersonal([]);
      setEppRows([]);
      setGastos([]);
      setLeadSelId(id);
      setEditandoCotId(null);
      toast("✓ Lead precargado: "+l.co+" — nueva cotización, completa personal y gastos","info");
    }
  };

  // Precargar lead cuando se navega desde CRM
  useEffect(()=>{
    if(!navLeadId) return;
    cargarDesdeLead(navLeadId);
    setTab("calculadora");
    onClearNavLead&&onClearNavLead();
  },[navLeadId]);

  // -- CÁLCULOS --
  const tcambio = sysConfig?.tc||3.6;
  // Costo por activo adicional según modo
  const cot = calcCot(personal,gastos.map(g=>({...g,monto:g.usd,mon:"USD"})),eppRows.map(e=>({...e,monto:e.precio*e.cant,mon:"USD"})),margenObj,"",tcambio);
  const costoUnitAdic = costoAdicMode==="estandar" ? 2.00
    : costoAdicMode==="calculado" && activosPres>0 ? Math.round((cot?.costo||0)/activosPres*100)/100
    : costoAdicManual;
  const costoPersonalUSD = personal.reduce((a,p)=>a+(p.cant*p.horas*p.tarifa),0);
  const costoEppUSD      = eppRows.reduce((a,e)=>a+(e.cant*e.precio),0);
  const costoGastosUSD   = gastos.reduce((a,g)=>a+(parseFloat(g.usd)||0),0);
  const costoTotal       = costoPersonalUSD + costoEppUSD + costoGastosUSD;
  const gAdmin           = costoPersonalUSD * MARGENES.admin;
  const gVentas          = costoPersonalUSD * MARGENES.ventas;
  const gMarketing       = costoPersonalUSD * MARGENES.marketing;
  const margenAmt        = costoTotal * (margenObj/100);
  const precioVenta      = costoTotal + gAdmin + gVentas + gMarketing + margenAmt;
  const margenReal       = costoTotal>0 ? ((precioVenta-costoTotal)/precioVenta*100) : 0;
  const cuotaAmt         = precioVenta/cuotas;

  // -- HELPERS PERSONAL --
  const addPersonal = () => {
    const t = tarifas[0];
    setPersonal(prev=>[...prev,{id:Date.now(),cargo:t.cargo,cant:1,horas:8,tarifa:t.usd,custom:false}]);
  };
  const addPersonalCustom = () => {
    setPersonal(prev=>[...prev,{id:Date.now(),cargo:"Cargo personalizado",cant:1,horas:8,tarifa:5.00,custom:true}]);
  };
  const updPersonal = (id,field,val) => {
    setPersonal(prev=>prev.map(p=>{
      if(p.id!==id) return p;
      const upd={...p,[field]:field==="horas"||field==="cant"?parseInt(val)||0:field==="tarifa"?parseFloat(val)||0:val};
      // Si cambia cargo y no es custom, actualizar tarifa automáticamente (solo si Admin o si es custom)
      if(field==="cargo"&&!p.custom){
        const t=tarifas.find(t=>t.cargo===val);
        if(t) upd.tarifa=t.usd;
      }
      return upd;
    }));
  };
  const delPersonal = (id) => setPersonal(prev=>prev.filter(p=>p.id!==id));

  // -- HELPERS EPP --
  const addEpp = () => {
    const e = EPP_ITEMS_DEFAULT[0];
    setEppRows(prev=>[...prev,{id:Date.now(),desc:e.desc,cant:1,precio:e.usd,custom:false}]);
  };
  const addEppCustom = () => {
    setEppRows(prev=>[...prev,{id:Date.now(),desc:"Material personalizado",cant:1,precio:0,custom:true}]);
  };
  const updEpp = (id,field,val) => {
    setEppRows(prev=>prev.map(e=>{
      if(e.id!==id) return e;
      const upd={...e,[field]:field==="cant"?parseInt(val)||0:field==="precio"?parseFloat(val)||0:val};
      if(field==="desc"&&!e.custom){
        const found=EPP_ITEMS_DEFAULT.find(x=>x.desc===val);
        if(found) upd.precio=found.usd;
      }
      return upd;
    }));
  };
  const delEpp = (id) => setEppRows(prev=>prev.filter(e=>e.id!==id));

  // -- HELPERS GASTOS --
  const addGasto = () => setGastos(prev=>[...prev,{id:Date.now(),desc:"Gasto adicional",usd:0}]);
  const updGasto = (id,field,val) => setGastos(prev=>prev.map(g=>g.id!==id?g:{...g,[field]:field==="usd"?parseFloat(val)||0:val}));
  const delGasto = (id) => setGastos(prev=>prev.filter(g=>g.id!==id));

  // -- GUARDAR COTIZACIÓN --




  // -- ANÁLISIS IA --
  const analizarIA = async () => {
    setAiLoading(true); setAiAnalysis("");
    const pLines = personal.map(p=>"  "+p.cargo+": "+p.cant+"p x "+p.horas+"h x $"+p.tarifa+"/h = $"+fi(p.cant*p.horas*p.tarifa)).join("\n");
    const eLines = eppRows.map(e=>"  "+e.desc+": "+e.cant+" x $"+e.precio+" = $"+fi(e.cant*e.precio)).join("\n");
    const gLines = gastos.map(g=>"  "+g.desc+": $"+g.usd).join("\n");
    const prompt = "Eres consultor financiero senior de NEXOVA Lima, Peru. Analiza esta cotizacion:\n\n"
      +"SERVICIO: "+servicio+"\nCLIENTE: "+(cliente||"sin especificar")+"\n\n"
      +"RESUMEN FINANCIERO:\n"
      +"Costo personal: $"+fi(costoPersonalUSD)+" USD\n"
      +"Costo EPP: $"+fi(costoEppUSD)+" USD\n"
      +"Gastos directos: $"+fi(costoGastosUSD)+" USD\n"
      +"Costo total: $"+fi(costoTotal)+" USD\n"
      +"Precio de venta: $"+fi(Math.round(precioVenta))+" USD\n"
      +"Margen real: "+f1(margenReal)+"% (minimo: 22%, ISO 9001: 30%)\n"
      +"Cuotas: "+cuotas+" de $"+fi(cuotaAmt)+" USD\n\n"
      +"PERSONAL "+personal.length+" cargos:\n"+pLines+"\n\n"
      +"EPP "+eppRows.length+" items:\n"+eLines+"\n\n"
      +"GASTOS:\n"+gLines+"\n\n"
      +"Proporciona: diagnostico del margen, riesgos, oportunidades, comparativo sectorial y recomendacion. Maximo 4 parrafos, directo y accionable.";

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const d = await r.json();
      setAiAnalysis(d.content?.[0]?.text||"Sin respuesta");
    } catch(e){ setAiAnalysis("Error al conectar con la IA: "+e.message); }
    setAiLoading(false);
  };

  const margenC = margenReal>=30?C.teal:margenReal>=22?C.blue:margenReal>=15?C.amber:C.red;

  const descargarCotPDF = () => {
    // Gráfica dona de estructura de costos
    const items = [
      {l:"Personal",v:costoPersonalUSD,c:C.navy},
      {l:"EPP",v:costoEppUSD,c:C.blue},
      {l:"Gastos",v:costoGastosUSD,c:C.teal},
      {l:"G.Admin",v:gAdmin+gVentas+gMarketing,c:C.amber},
    ].filter(i=>i.v>0);
    const total = items.reduce((a,i)=>a+i.v,0)||1;
    let donutSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">';
    let offset = 0;
    const r=60,cx=90,cy=90,circ=2*Math.PI*r;
    items.forEach(it=>{
      const pct=it.v/total;
      donutSvg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+it.c+'" stroke-width="28" stroke-dasharray="'+(circ*pct)+' '+(circ*(1-pct))+'" stroke-dashoffset="'+(-offset*circ)+'" transform="rotate(-90 '+cx+' '+cy+')" />';
      offset+=pct;
    });
    donutSvg+='<text x="90" y="85" text-anchor="middle" font-size="13" font-weight="800" fill="#1a2e4a">$'+fi(Math.round(precioVenta))+'</text>';
    donutSvg+='<text x="90" y="102" text-anchor="middle" font-size="9" fill="#64748b">Precio venta</text></svg>';
    const leyenda = '<div style="display:flex;flex-direction:column;gap:6px;justify-content:center">'+
      items.map(it=>'<div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;border-radius:2px;background:'+it.c+';flex-shrink:0"></div><div style="font-size:11px;flex:1;color:#475569">'+it.l+'</div><div style="font-size:11px;font-weight:700;color:#1a2e4a;font-family:monospace">$'+fi(Math.round(it.v))+'</div></div>').join('')+
      '</div>';

    // Tabla de personal
    const tabPersonal = personal.filter(p=>p.cant>0).length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Cargo</th><th style="padding:7px 10px;text-align:right">Cant.</th><th style="padding:7px 10px;text-align:right">Horas</th><th style="padding:7px 10px;text-align:right">Tarifa/h</th><th style="padding:7px 10px;text-align:right">Subtotal</th></tr>'+
        personal.filter(p=>p.cant>0).map((p,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+p.cargo+'</td><td style="padding:6px 10px;text-align:right">'+p.cant+'</td><td style="padding:6px 10px;text-align:right">'+p.horas+'h</td><td style="padding:6px 10px;text-align:right;font-family:monospace">$'+p.tarifa+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1a2e4a">$'+fi(p.cant*p.horas*p.tarifa)+'</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin personal asignado</div>';

    // Tabla EPP
    const tabEPP = eppRows.filter(e=>e.cant>0).length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Ítem</th><th style="padding:7px 10px;text-align:right">Cant.</th><th style="padding:7px 10px;text-align:right">P.Unit</th><th style="padding:7px 10px;text-align:right">Total</th></tr>'+
        eppRows.filter(e=>e.cant>0).map((e,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+e.desc+'</td><td style="padding:6px 10px;text-align:right">'+e.cant+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">$'+e.precio+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">$'+fi(e.cant*e.precio)+'</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin EPP/equipos asignados</div>';

    // Tabla Gastos
    const tabGastos = gastos.filter(g=>g.usd>0).length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Concepto</th><th style="padding:7px 10px;text-align:right">USD</th></tr>'+
        gastos.filter(g=>g.usd>0).map((g,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+g.desc+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">$'+fi(g.usd)+'</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin gastos directos</div>';

    // Resumen cuotas
    const tabCuotas = '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1D9E75;color:#fff"><th style="padding:7px 10px;text-align:left">Cuota</th><th style="padding:7px 10px;text-align:right">Monto USD</th><th style="padding:7px 10px;text-align:right">Monto PEN (TC 3.6)</th></tr>'+
      Array.from({length:cuotas},(_,i)=>'<tr style="background:'+(i%2?'#f0fdf9':'#fff')+'"><td style="padding:6px 10px;font-weight:600">Cuota '+(i+1)+' de '+cuotas+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1D9E75">$'+fi(Math.round(cuotaAmt))+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;color:#475569">S/ '+fi(Math.round(cuotaAmt*3.6))+'</td></tr>').join('')+
      '</table>';

    const margenColor2 = margenReal>=30?'#1D9E75':margenReal>=22?'#BA7517':'#E24B4A';

    generarPDFRico({
      nombre: "Cotizacion_"+(cliente||"cliente").replace(/[^a-zA-Z0-9]/g,"_")+"_"+new Date().toLocaleDateString("es-PE").replace(/\//g,"-"),
      titulo: "Cotización Comercial",
      subtitulo: (cliente||"—")+" · "+(servicio||"")+" · "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}),
      kpis: [
        {label:"Precio de venta",  value:"$"+fi(Math.round(precioVenta)), color:C.navy},
        {label:"Margen real",       value:f1(margenReal)+"%",             color:margenColor2},
        {label:"Costo total",       value:"$"+fi(Math.round(costoTotal)), color:C.blue},
        {label:"Cuotas",            value:cuotas+" × $"+fi(Math.round(cuotaAmt)), color:C.teal},
        {label:"Plazo",             value:plazo||"A definir",             color:C.amber},
      ],
      secciones: [
        {titulo:"Estructura de Costos", contenido:'<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap">'+donutSvg+leyenda+'</div>'},
        {titulo:"Personal Asignado",    contenido:tabPersonal},
        {titulo:"EPP y Equipos",        contenido:tabEPP},
        {titulo:"Gastos Directos",      contenido:tabGastos},
        {titulo:"Cronograma de Pagos",  contenido:tabCuotas},
      ],
      analisis: {
        situacion: "Cotización para <strong>"+(cliente||"cliente")+"</strong> — servicio: <strong>"+(servicio||"—")+"</strong>. Precio de venta: <strong>USD "+fi(Math.round(precioVenta))+"</strong> (S/ "+fi(Math.round(precioVenta*3.6))+" PEN). Plazo estimado: <strong>"+(plazo||"A definir")+"</strong>.",
        logros: margenReal>=30 ? "Margen de <strong>"+f1(margenReal)+"%</strong> — supera el objetivo ISO 9001 (30%). Cotización competitiva." : undefined,
        riesgos: margenReal<22 ? "Margen de <strong>"+f1(margenReal)+"%</strong> está por debajo del mínimo aceptable (22%). Revisar costos o ajustar precio." : margenReal<30 ? "Margen de <strong>"+f1(margenReal)+"%</strong> — entre mínimo (22%) y objetivo ISO 9001 (30%). Evaluar optimización de costos." : undefined,
        recomendaciones: "<strong>1.</strong> Validar las horas cotizadas por cargo con el jefe de proyecto.<br/><strong>2.</strong> Confirmar los gastos directos (viáticos, EPP) con logística.<br/><strong>3.</strong> Presentar propuesta formal al cliente dentro de las 48h.<br/><strong>4.</strong> Registrar la cotización en el CRM al enviar.",
      }
    });
    toast("✓ Cotización PDF generada","success");
  };


  const guardarCot = (modo) => {
    if(!cliente.trim()){toast("Ingresa el nombre del cliente","error");return;}
    const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});
    if(editandoCotId && modo!=="nueva"){
      setCotizaciones(prev=>prev.map(c=>c.id!==editandoCotId?c:{
        ...c, cliente, servicio, moneda,
        venta:Math.round(precioVenta), costo:Math.round(costoTotal),
        margen:parseFloat(margenReal.toFixed(1)), margenObj, cuotas, plazo,
        personal:[...personal], epp:[...eppRows], gastos:[...gastos],
        activosPresupuestados:activosPres,
      }));
      toast("✓ "+editandoCotId+" actualizada","success");
      setEditandoCotId(null);
      setLeadSelId("");
      setTab("lista");
      return;
    }
    const nueva = {
      id:"COT-"+new Date().getFullYear()+"-"+String(cotizaciones.length+11).padStart(3,"0"),
      leadId:leadSelId||"",
      cliente, servicio, moneda,
      venta:Math.round(precioVenta), costo:Math.round(costoTotal),
      margen:parseFloat(margenReal.toFixed(1)), margenObj, cuotas, plazo,
      personal:[...personal], epp:[...eppRows], gastos:[...gastos],
      activosPresupuestados:activosPres, costoUnitAdicional:costoUnitAdic, costoAdicMode,
      estado:"calificado", fecha, autor:usuario.nombre,
    };
    setCotizaciones(prev=>[nueva,...prev]);
    setEditandoCotId(null);
    setLeadSelId("");
    toast("✓ Cotización "+nueva.id+" guardada","success");
    if(onTourAction) setTimeout(onTourAction,800);
    setSelCot(nueva);
    setTab("lista");
  };


  return(
    <div>
      {/* Modal tarifas - solo Admin */}
      {modalTarifas&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalTarifas(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:580,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"var(--card)",zIndex:1}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>{isAdmin?"Modificar tarifas":"Ver tarifas"}</div><div style={{fontSize:11,color:"var(--t3)"}}>Basadas en Excel WIN_INTERNET · Tipo de cambio S/3.60</div></div>
              <button onClick={()=>setModalTarifas(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"16px 20px"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"var(--navy)"}}>
                  <th style={{padding:"8px 10px",color:"#fff",textAlign:"left",fontWeight:600}}>Cargo</th>
                  <th style={{padding:"8px 10px",color:"#fff",textAlign:"right",fontWeight:600}}>S/./h</th>
                  <th style={{padding:"8px 10px",color:"#fff",textAlign:"right",fontWeight:600}}>USD/h</th>
                </tr></thead>
                <tbody>
                  {tarifas.map((t,i)=>(
                    <tr key={t.id} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                      <td style={{padding:"7px 10px",color:"var(--t1)",fontWeight:500}}>{t.cargo}</td>
                      <td style={{padding:"7px 10px",textAlign:"right"}}>
                        {isAdmin
                          ? <input type="number" value={t.soles} step="0.01"
                              onChange={e=>setTarifas(prev=>prev.map(x=>x.id===t.id?{...x,soles:parseFloat(e.target.value)||0,usd:parseFloat(e.target.value)/3.6}:x))}
                              style={{width:70,textAlign:"right",padding:"2px 4px",fontSize:11,border:"1px solid var(--bd)",borderRadius:3}}/>
                          : <span className="mono">{t.soles.toFixed(2)}</span>
                        }
                      </td>
                      <td style={{padding:"7px 10px",textAlign:"right",fontWeight:700,color:C.blue}} className="mono">
                        {t.usd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isAdmin&&<div style={{padding:"10px 12px",background:"rgba(186,117,23,.08)",border:"1px solid rgba(186,117,23,.25)",borderRadius:"var(--r)",fontSize:11,color:C.amber,marginTop:12}}>⚠️ Solo el Administrador puede modificar las tarifas oficiales.</div>}
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
                {isAdmin&&<button className="btn btn-p btn-sm" onClick={()=>{setTarifasGlobal&&setTarifasGlobal(tarifas);setModalTarifas(false);toast("✓ Tarifas actualizadas y sincronizadas en todos los módulos","success");}}>✓ Guardar tarifas</button>}
                <button className="btn btn-s btn-sm" style={{marginLeft:8}} onClick={()=>setModalTarifas(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Rentabilidad y Cotizaciones</div><div className="ss">{cotizaciones.length} cotizaciones · margen promedio {f1(cotizaciones.reduce((a,c)=>a+c.margen,0)/Math.max(cotizaciones.length,1))}%</div></div>
        <div style={{display:"flex",gap:8}}>
          {tab==="lista"&&<button className="btn btn-p btn-sm" onClick={()=>{setTab("calculadora");setSelCot(null);}}>{I.plus} Nueva Cotización</button>}
        </div>
      </div>

      <Tabs tabs={[{id:"lista",lbl:"Cotizaciones"},{id:"calculadora",lbl:"Calculadora"},{id:"analisis",lbl:"Análisis IA"}]} active={tab} onChange={setTab}/>

      {/* -- LISTA -- */}
      {tab==="lista"&&(
        <div>
          {/* -- Tarjeta resumen cotizaciones -- */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:12}}>
            {[
              {lbl:"Total",          v:cotizaciones.length,                                       col:"#1E293B"},
              {lbl:"Calificado",     v:cotizaciones.filter(c=>c.estado==="calificado").length,     col:"#4a9fd4"},
              {lbl:"Propuesta",      v:cotizaciones.filter(c=>c.estado==="propuesta").length,      col:"#D97706"},
              {lbl:"Negociación",    v:cotizaciones.filter(c=>c.estado==="negociacion").length,    col:"#9333ea"},
              {lbl:"Ganado",         v:cotizaciones.filter(c=>c.estado==="ganado").length,         col:"#0D9488"},
              {lbl:"Valor ganado",   v:"$"+fi(cotizaciones.filter(c=>c.estado==="ganado").reduce((a,c)=>a+(c.venta||0),0)), col:"#0D9488"},
            ].map((k,i)=>(
              <div key={i} style={{background:"var(--card)",border:"1px solid var(--bd)",
                borderRadius:"var(--r)",padding:"10px 14px",textAlign:"center",
                borderTop:i>0&&i<5?`3px solid ${k.col}`:"1px solid var(--bd)"}}>
                <div style={{fontSize:i===5?14:22,fontWeight:800,color:k.col,fontFamily:"var(--mono)"}}>{k.v}</div>
                <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginTop:2}}>{k.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {[
              {l:"Total cotizado",v:"$"+fi(cotizaciones.reduce((a,c)=>a+c.venta,0)),col:"blue"},
              {l:"Margen promedio",v:f1(cotizaciones.reduce((a,c)=>a+c.margen,0)/Math.max(cotizaciones.length,1))+"%",col:"teal"},
              {l:"Sobre meta (≥22%)",v:cotizaciones.filter(c=>c.margen>=22).length,col:"teal"},
              {l:"Bajo meta (<22%)",v:cotizaciones.filter(c=>c.margen<22).length,col:"red"},
            ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
          </div>
          <div className="card">
            {(()=>{
              const SIC={asc:"↑",desc:"↓"};
              const thS = (col,lbl,align="left") => (
                <th onClick={()=>sortBy(col)} style={{cursor:"pointer",textAlign:align,userSelect:"none",whiteSpace:"nowrap"}}>
                  {lbl} <span style={{opacity:sortCot.col===col?1:.3,fontSize:9}}>{sortCot.col===col?SIC[sortCot.dir]:"↕"}</span>
                </th>
              );
              const sorted = [...cotizaciones].sort((a,b)=>{
                const d = sortCot.dir==="asc"?1:-1;
                const col = sortCot.col;
                if(col==="venta"||col==="margen") return (a[col]||0)>(b[col]||0)?d:-d;
                return String(a[col]||"").localeCompare(String(b[col]||""),"es")*d;
              });
              return (
            <table>
              <thead><tr>
                {thS("id","ID")} {thS("cliente","Cliente")} {thS("servicio","Servicio")}
                {thS("venta","Venta","right")} {thS("margen","Margen","right")}
                {thS("estado","Estado")} {thS("autor","Autor")} {thS("fecha","Fecha")}
                <th>Acciones</th>
              </tr></thead>
              <tbody>
                {sorted.map(c=>(
                  <tr key={c.id} style={{cursor:"pointer"}} title="Clic para editar esta cotización" onClick={()=>{
                      setSelCot(c);setTab("calculadora");
                      setCliente(c.cliente||"");
                      setServicio(c.servicio||c.proyecto||"");
                      setPersonal(c.personal?.length?[...c.personal]:[]);
                      setEppRows(c.epp?.length?[...c.epp]:[]);
                      setGastos(c.gastos?.length?[...c.gastos]:[]);
                      setCuotas(c.cuotas||4);
                      setPlazo(c.plazo||"");
                      setMoneda(c.moneda||"USD");
                      setActivosPres(c.activosPresupuestados||0);
                      if(c.margenObj) setMargenObj(c.margenObj); else if(c.margen>0) setMargenObj(Math.round(c.margen));
                      setLeadSelId(c.leadId||"");
                      setEditandoCotId(c.id);
                    }}>
                    <td className="mono" style={{fontSize:11,color:C.blue,fontWeight:700}}>{c.id}</td>
                    <td style={{fontWeight:600}}>{c.cliente}</td>
                    <td style={{fontSize:11,color:"var(--t3)",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.servicio}</td>
                    <td className="mono" style={{textAlign:"right",fontWeight:700}}>{"$"+fi(c.venta)}</td>
                    <td style={{textAlign:"right"}}>{(()=>{
                      const mg = c.margen>0 ? c.margen
                        : c.costo>0 ? parseFloat(f1((c.venta-c.costo)/c.venta*100))
                        : null;
                      return mg!==null
                        ? <span style={{fontSize:12,fontWeight:700,color:margenColor(mg)}}>{f1(mg)}%</span>
                        : <span style={{fontSize:11,color:"var(--t3)"}}>sin costo</span>;
                    })()}</td>
                    <td><span className={"pill "+(
                        c.estado==="ganado"?"teal":
                        c.estado==="negociacion"?"purple":
                        c.estado==="propuesta"?"amber":
                        c.estado==="calificado"?"navy":
                        c.estado==="prospecto"?"blue":"navy"
                      )}>{
                        c.estado==="ganado"?"Ganado":
                        c.estado==="negociacion"?"Negociación":
                        c.estado==="propuesta"?"Propuesta":
                        c.estado==="calificado"?"Calificado":
                        c.estado==="prospecto"?"Prospecto":"—"
                      }</span></td>
                    <td style={{fontSize:11,color:"var(--t3)"}}>{c.autor||"—"}</td>
                    <td style={{fontSize:11,color:"var(--t3)"}}>{c.fecha}</td>
                    <td style={{display:"flex",gap:4}}>
                      <button className="btn btn-s btn-xs" onClick={e=>{
  e.stopPropagation();
  const tabDetalle='<table style="width:100%;border-collapse:collapse;font-size:11px">'+
    [["ID Cotización",c.id],["Cliente",c.cliente],["Servicio",c.servicio||"—"],["Fecha",c.fecha],["Autor",c.autor||"—"],["Estado",(c.estado||"—").toUpperCase()]].map(([k,v],i)=>
      '<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600;color:#64748b;width:160px">'+k+'</td><td style="padding:6px 10px;font-weight:500">'+v+'</td></tr>').join('')+'</table>';
  const mgColor=c.margen>=30?'#1D9E75':c.margen>=22?'#BA7517':'#E24B4A';
  const tabFinanciero='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px">Concepto</th><th style="padding:7px 10px;text-align:right">USD</th><th style="padding:7px 10px;text-align:right">PEN (TC 3.6)</th></tr>'+
    [["Costo total",c.costo,"#475569"],["Precio de venta",c.venta,"#1a2e4a"],["Margen",Math.round(c.venta-c.costo),mgColor]].map(([k,v,col],i)=>
      '<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600">'+k+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:'+col+'">$'+fi(v)+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;color:#64748b">S/ '+fi(Math.round(v*3.6))+'</td></tr>').join('')+
    '</table>';
  const cuotaAmt2=Math.round(c.venta/Math.max(c.cuotas||1,1));
  const tabCuotas2='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1D9E75;color:#fff"><th style="padding:7px 10px">Cuota</th><th style="padding:7px 10px;text-align:right">USD</th><th style="padding:7px 10px;text-align:right">PEN</th></tr>'+
    Array.from({length:c.cuotas||1},(_,i)=>'<tr style="background:'+(i%2?'#f0fdf9':'#fff')+'"><td style="padding:6px 10px;font-weight:600">Cuota '+(i+1)+' de '+(c.cuotas||1)+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1D9E75">$'+fi(cuotaAmt2)+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;color:#64748b">S/ '+fi(Math.round(cuotaAmt2*3.6))+'</td></tr>').join('')+
    '</table>';
  generarPDFRico({
    nombre:"COT_"+c.id+"_"+c.cliente.replace(/[^a-zA-Z0-9]/g,"_"),
    titulo:"Cotización "+c.id,
    subtitulo:c.cliente+" · "+(c.servicio||"")+" · "+c.fecha,
    kpis:[
      {label:"Precio de venta", value:"$"+fi(c.venta),   color:"#1a2e4a"},
      {label:"Margen",          value:f1(c.margen)+"%",   color:mgColor},
      {label:"Costo total",     value:"$"+fi(c.costo),    color:"#4a9fd4"},
      {label:"Cuotas",          value:(c.cuotas||1)+" × $"+fi(cuotaAmt2), color:"#1D9E75"},
    ],
    secciones:[
      {titulo:"Datos de la Cotización",  contenido:tabDetalle},
      {titulo:"Resumen Financiero",      contenido:tabFinanciero},
      {titulo:"Cronograma de Pagos",     contenido:tabCuotas2},
    ],
    analisis:{
      situacion:"Cotización <strong>"+c.id+"</strong> para <strong>"+c.cliente+"</strong>. Precio: <strong>USD "+fi(c.venta)+"</strong>. Margen: <strong>"+f1(c.margen)+"%</strong>.",
      logros: c.margen>=30?"Margen superior al objetivo ISO 9001 (30%). Cotización muy rentable.":undefined,
      riesgos: c.margen<22?"Margen inferior al mínimo aceptable (22%). Revisar antes de enviar.":undefined,
      recomendaciones:"<strong>1.</strong> Verificar que los costos estén actualizados.<br/><strong>2.</strong> Enviar al cliente dentro de las 48h de aprobación.<br/><strong>3.</strong> Registrar el estado en el CRM.",
    }
  });
  toast("✓ PDF descargado","success");
}}>{I.dl}</button>
                      <button className="btn btn-r btn-xs" style={{fontSize:10}} onClick={e=>{e.stopPropagation();if(window.confirm("¿Eliminar cotización "+c.id+"?"))setCotizaciones(prev=>prev.filter(x=>x.id!==c.id));toast("Cotización eliminada","success");}}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              );
            })()}
          </div>
        </div>
      )}

      {/* -- CALCULADORA -- */}
      {tab==="calculadora"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:14,alignItems:"start"}}>
          {/* Panel izquierdo */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Datos del proyecto */}
            <div className="card">
              <div className="card-hd"><div className="ct">Datos del proyecto</div></div>
              <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {/* Selector de lead — precarga datos automáticamente */}
                <div style={{gridColumn:"1/-1"}}>
                  <label className="fl">Cargar desde Lead (opcional)</label>
                  <select value={leadSelId} onChange={e=>cargarDesdeLead(e.target.value)}
                    style={{color:leadSelId?"var(--t1)":"var(--t3)"}}>
                    <option value="">— Selecciona un lead para precargar datos —</option>
                    {allLeads.map(l=>(
                      <option key={l.id} value={l.id}>
                        {l.co} — {l.stage==="ganado"?"✓ Ganado":l.stage} — ${(l.val||0).toLocaleString()}
                      </option>
                    ))}
                    {/* Clientes de cotizaciones sin lead */}
                    {(cotizaciones||[])
                      .filter(c=>c.cliente && !allLeads.find(l=>l.co===c.cliente||l.id===c.leadId))
                      .reduce((acc,c)=>acc.find(x=>x===c.cliente)?acc:[...acc,c.cliente],[])
                      .map(cliente=>(
                        <option key={"cot-"+cliente} value={"cot-"+cliente}>
                          {cliente} — (solo cotización)
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div><label className="fl">Cliente *</label><input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nombre de la empresa"/></div>
                <div><label className="fl">Servicio</label>
                  <select value={servicio} onChange={e=>setServicio(e.target.value)}>
                    {SERVICIOS_AQUARIUS.map(s=><option key={s.id} value={s.nombre}>{s.id} — {s.nombre}</option>)}
                  </select>
                </div>
                <div><label className="fl">Plazo estimado</label><input value={plazo} onChange={e=>setPlazo(e.target.value)} placeholder="9 semanas"/></div>
                <div><label className="fl">N° de cuotas</label>
                  <select value={cuotas} onChange={e=>setCuotas(parseInt(e.target.value))}>
                    {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} cuota{n>1?"s":""}</option>)}
                  </select>
                </div>
                <div><label className="fl">Moneda de cotización</label>
                  <select value={moneda} onChange={e=>setMoneda(e.target.value)}
                    style={{fontWeight:600}}>
                    <option value="USD">🇺🇸 Dólares (USD)</option>
                    <option value="PEN">🇵🇪 Soles (PEN)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Activos presupuestados y costo adicional */}
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Activos presupuestados</div><div className="cs">Define la cantidad base y el costo por activo adicional</div></div>
              </div>
              <div style={{padding:"0 16px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label className="fl">Cantidad de activos a inventariar</label>
                  <input type="number" min="0" value={activosPres||""} placeholder="Ej: 3500"
                    onChange={e=>setActivosPres(parseInt(e.target.value)||0)}/>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:3}}>
                    Activos incluidos en el contrato. Si se superan, se cobran adicionales.
                  </div>
                </div>
                <div>
                  <label className="fl">Costo por activo adicional</label>
                  <select value={costoAdicMode} onChange={e=>setCostoAdicMode(e.target.value)}
                    style={{marginBottom:6}}>
                    <option value="estandar">Tarifa estándar — $2.00 / activo</option>
                    <option value="calculado">Calculado del proyecto (costo ÷ activos)</option>
                    <option value="manual">Definir manualmente</option>
                  </select>
                  {costoAdicMode==="manual"&&(
                    <input type="number" step="0.01" min="0" value={costoAdicManual}
                      onChange={e=>setCostoAdicManual(parseFloat(e.target.value)||0)}
                      placeholder="USD por activo"/>
                  )}
                  {costoAdicMode!=="manual"&&(
                    <div style={{fontSize:12,fontWeight:700,color:C.teal,padding:"4px 8px",
                      background:"rgba(13,148,136,.08)",borderRadius:6}}>
                      ${costoUnitAdic.toFixed(2)} / activo adicional
                    </div>
                  )}
                </div>
              </div>
              {activosPres>0&&(
                <div style={{margin:"0 16px 16px",padding:"10px 14px",background:"rgba(13,148,136,.06)",
                  borderRadius:8,border:"1px solid rgba(13,148,136,.15)",fontSize:12}}>
                  <span style={{color:"var(--t2)"}}>Ejemplo: si se inventarían </span>
                  <strong>{(activosPres*1.2).toFixed(0)}</strong>
                  <span style={{color:"var(--t2)"}}> activos (20% más), el cargo adicional sería </span>
                  <strong style={{color:C.teal}}>${(activosPres*0.2*costoUnitAdic).toFixed(2)}</strong>
                </div>
              )}
            </div>
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Personal asignado</div><div className="cs">Subtotal: <strong style={{color:C.blue}}>{(moneda==="PEN"?"S/ ":"$")+fi(costoPersonalUSD)}</strong></div></div>
                <div style={{display:"flex",gap:6}}>
                  {isAdmin
                    ? <button className="btn btn-s btn-xs" onClick={addPersonal}>+ Del catálogo</button>
                    : <button className="btn btn-s btn-xs" onClick={addPersonal}>+ Del catálogo</button>
                  }
                  <button className="btn btn-s btn-xs" onClick={addPersonalCustom} title="Agregar cargo no estándar">+ Personalizado</button>
                </div>
              </div>
              <div style={{padding:"0 16px 12px"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid var(--bd)"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",color:"var(--t3)",fontWeight:600}}>Cargo</th>
                    <th style={{padding:"6px 4px",textAlign:"center",color:"var(--t3)",fontWeight:600,width:50}}>Cant.</th>
                    <th style={{padding:"6px 4px",textAlign:"center",color:"var(--t3)",fontWeight:600,width:60}}>Horas</th>
                    <th style={{padding:"6px 4px",textAlign:"right",color:"var(--t3)",fontWeight:600,width:70}}>$/h</th>
                    <th style={{padding:"6px 4px",textAlign:"right",color:"var(--t3)",fontWeight:600,width:80}}>Subtotal</th>
                    <th style={{width:24}}></th>
                  </tr></thead>
                  <tbody>
                    {personal.map((p,i)=>(
                      <tr key={p.id} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                        <td style={{padding:"5px 8px"}}>
                          {p.custom
                            ? <input value={p.cargo} onChange={e=>updPersonal(p.id,"cargo",e.target.value)} style={{width:"100%",fontSize:11}}/>
                            : <select value={p.cargo} onChange={e=>updPersonal(p.id,"cargo",e.target.value)} style={{width:"100%",fontSize:11}}>
                                {tarifas.map(t=><option key={t.id} value={t.cargo}>{t.cargo}</option>)}
                              </select>
                          }
                          {p.custom&&<span style={{fontSize:9,color:C.amber,marginLeft:4}}>personalizado</span>}
                        </td>
                        <td style={{padding:"5px 4px",textAlign:"center"}}>
                          <input type="number" value={p.cant} onChange={e=>updPersonal(p.id,"cant",e.target.value)} style={{width:60,textAlign:"center",fontSize:11}}/>
                        </td>
                        <td style={{padding:"5px 4px",textAlign:"center"}}>
                          <input type="number" value={p.horas} onChange={e=>updPersonal(p.id,"horas",e.target.value)} style={{width:68,textAlign:"center",fontSize:11}}/>
                        </td>
                        <td style={{padding:"5px 4px",textAlign:"right"}}>
                          {p.custom
                            ? <input type="number" value={p.tarifa} onChange={e=>updPersonal(p.id,"tarifa",e.target.value)} style={{width:64,textAlign:"right",fontSize:11}}/>
                            : <span className="mono" style={{fontSize:11,color:"var(--t2)"}}>{sym}{p.tarifa.toFixed(2)}</span>
                          }
                        </td>
                        <td className="mono" style={{padding:"5px 4px",textAlign:"right",fontWeight:700,color:C.blue,fontSize:12}}>{"$"+fi(p.cant*p.horas*p.tarifa)}</td>
                        <td style={{padding:"5px 4px",textAlign:"center"}}>
                          <button onClick={()=>delPersonal(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",fontSize:13}}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EPP y equipos */}
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">EPP y Equipos</div><div className="cs">Subtotal: <strong style={{color:C.teal}}>{(moneda==="PEN"?"S/ ":"$")+fi(costoEppUSD)}</strong></div></div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-s btn-xs" onClick={addEpp}>+ Del catálogo</button>
                  <button className="btn btn-s btn-xs" onClick={addEppCustom}>+ Personalizado</button>
                </div>
              </div>
              <div style={{padding:"0 16px 12px"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{borderBottom:"1px solid var(--bd)"}}>
                    <th style={{padding:"6px 8px",textAlign:"left",color:"var(--t3)",fontWeight:600}}>Descripción</th>
                    <th style={{padding:"6px 4px",textAlign:"center",color:"var(--t3)",fontWeight:600,width:50}}>Cant.</th>
                    <th style={{padding:"6px 4px",textAlign:"right",color:"var(--t3)",fontWeight:600,width:70}}>$/ud.</th>
                    <th style={{padding:"6px 4px",textAlign:"right",color:"var(--t3)",fontWeight:600,width:80}}>Subtotal</th>
                    <th style={{width:24}}></th>
                  </tr></thead>
                  <tbody>
                    {eppRows.map((e,i)=>(
                      <tr key={e.id} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                        <td style={{padding:"5px 8px"}}>
                          {e.custom
                            ? <input value={e.desc} onChange={x=>updEpp(e.id,"desc",x.target.value)} style={{width:"100%",fontSize:11}}/>
                            : <select value={e.desc} onChange={x=>updEpp(e.id,"desc",x.target.value)} style={{width:"100%",fontSize:11}}>
                                {EPP_ITEMS_DEFAULT.map(x=><option key={x.id} value={x.desc}>{x.desc}</option>)}
                              </select>
                          }
                          {e.custom&&<span style={{fontSize:9,color:C.amber,marginLeft:4}}>personalizado</span>}
                        </td>
                        <td style={{padding:"5px 4px",textAlign:"center"}}>
                          <input type="number" value={e.cant} onChange={x=>updEpp(e.id,"cant",x.target.value)} style={{width:60,textAlign:"center",fontSize:11}}/>
                        </td>
                        <td style={{padding:"5px 4px",textAlign:"right"}}>
                          {e.custom
                            ? <input type="number" value={e.precio} onChange={x=>updEpp(e.id,"precio",x.target.value)} style={{width:64,textAlign:"right",fontSize:11}}/>
                            : <span className="mono" style={{fontSize:11,color:"var(--t2)"}}>{sym}{e.precio.toFixed(2)}</span>
                          }
                        </td>
                        <td className="mono" style={{padding:"5px 4px",textAlign:"right",fontWeight:700,color:C.teal,fontSize:12}}>{"$"+fi(e.cant*e.precio)}</td>
                        <td style={{padding:"5px 4px",textAlign:"center"}}>
                          <button onClick={()=>delEpp(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",fontSize:13}}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gastos directos */}
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Gastos directos</div><div className="cs">Subtotal: <strong style={{color:C.amber}}>{(moneda==="PEN"?"S/ ":"$")+fi(costoGastosUSD)}</strong></div></div>
                <button className="btn btn-s btn-xs" onClick={addGasto}>+ Agregar</button>
              </div>
              <div style={{padding:"0 16px 12px"}}>
                {gastos.map((g,i)=>(
                  <div key={g.id} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:i<gastos.length-1?"1px solid var(--bd)":"none"}}>
                    <input value={g.desc} onChange={e=>updGasto(g.id,"desc",e.target.value)} style={{flex:1,fontSize:12}} placeholder="Descripción"/>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:11,color:"var(--t3)"}}>$</span>
                      <input type="number" value={g.usd} onChange={e=>updGasto(g.id,"usd",e.target.value)} style={{width:80,textAlign:"right",fontSize:12}} placeholder="0.00"/>
                      <span style={{fontSize:10,color:"var(--t3)"}}>USD</span>
                    </div>
                    <button onClick={()=>delGasto(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",fontSize:13}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel derecho - resumen */}
          <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:70}}>
            <div className="card" style={{borderTop:"3px solid "+margenC}}>
              <div style={{padding:"14px 16px",borderBottom:"1px solid var(--bd)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Resumen financiero</div>
                {(()=>{
                  const sym = moneda==="PEN"?"S/ ":"$";
                  const tc  = 3.6;
                  const cv  = v => moneda==="PEN" ? fi(Math.round(v*tc)) : fi(v);
                  return [
                    {l:"Costo personal",          v:sym+cv(costoPersonalUSD), col:"var(--t2)"},
                    {l:"EPP y equipos",            v:sym+cv(costoEppUSD),      col:"var(--t2)"},
                    {l:"Gastos directos",          v:sym+cv(costoGastosUSD),   col:"var(--t2)"},
                    {l:"G. administrativos (4%)",  v:sym+cv(gAdmin),           col:"var(--t3)"},
                    {l:"G. ventas (1.5%)",         v:sym+cv(gVentas),          col:"var(--t3)"},
                    {l:"G. marketing (1.5%)",      v:sym+cv(gMarketing),       col:"var(--t3)"},
                  ];
                })().map((k,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12}}>
                    <span style={{color:"var(--t3)"}}>{k.l}</span>
                    <span className="mono" style={{color:k.col,fontWeight:500}}>{k.v}</span>
                  </div>
                ))}
                <div style={{height:1,background:"var(--bd)",margin:"8px 0"}}/>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:12}}>
                  <span style={{color:"var(--t2)"}}>Costo total base</span>
                  <span className="mono" style={{fontWeight:700}}>{(moneda==="PEN"?"S/ "+fi(Math.round(costoTotal*3.6)):"$"+fi(costoTotal))}</span>
                </div>
                {/* Margen slider */}
                <div style={{marginTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                    <span style={{color:"var(--t3)"}}>Margen objetivo</span>
                    <span style={{fontWeight:700,color:margenC}}>{margenObj}%</span>
                  </div>
                  <input type="range" min="10" max="50" step="0.5" value={margenObj} onChange={e=>setMargenObj(parseFloat(e.target.value))} style={{width:"100%",accentColor:margenC}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t3)"}}>
                    <span>Mínimo 22%</span><span>ISO 9001: 30%</span>
                  </div>
                </div>
              </div>
              {/* Precio final */}
              <div style={{padding:"14px 16px",background:"var(--hv)"}}>
                <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Precio de venta</div>
                <div className="mono" style={{fontSize:28,fontWeight:900,color:C.navy}}>{moneda==="PEN"?"S/ "+fi(Math.round(precioVenta)):"$"+fi(Math.round(precioVenta))}</div>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:4}}>{moneda==="PEN"?"PEN + IGV":"USD + IGV"}</div>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:8}}>
                  {moneda==="PEN"
                    ? <span>≈ <strong>${fi(Math.round(precioVenta/3.6))}</strong> USD (TC 3.60)</span>
                    : <span>≈ <strong>S/ {fi(Math.round(precioVenta*3.6))}</strong> PEN (TC 3.60)</span>
                  }
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                  <div style={{flex:1,height:8,borderRadius:4,background:"var(--bd)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:Math.min(margenReal,50)+"%",background:margenC,borderRadius:4,transition:"width .3s"}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:margenC}}>{f1(margenReal)}%</span>
                </div>
                <div style={{fontSize:11,color:"var(--t3)",marginBottom:12}}>
                  {cuotas} cuotas de <strong className="mono">{sym+fi(cuotaAmt)}</strong>
                </div>
                {margenReal < 22 && (
                  <div style={{padding:"8px 10px",background:"rgba(226,75,74,.1)",border:"1px solid rgba(226,75,74,.3)",borderRadius:"var(--r)",fontSize:11,color:C.red,marginBottom:10}}>
                    ⚠️ Margen por debajo del mínimo requerido (22%)
                  </div>
                )}
                {margenReal >= 22 && margenReal < 30 && (
                  <div style={{padding:"8px 10px",background:"rgba(186,117,23,.1)",border:"1px solid rgba(186,117,23,.3)",borderRadius:"var(--r)",fontSize:11,color:C.amber,marginBottom:10}}>
                    ⚠️ Margen bajo meta ISO 9001 (30%)
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {editandoCotId?(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{fontSize:11,color:"var(--t3)",padding:"4px 8px",background:"var(--hv)",borderRadius:6}}>
                        Editando: <strong>{editandoCotId}</strong>
                      </div>
                      <button className="btn btn-p" onClick={()=>guardarCot("actualizar")}>{I.check} Actualizar cotización</button>
                      <button className="btn btn-s" onClick={()=>guardarCot("nueva")}>📋 Guardar como nueva</button>
                      <button className="btn btn-r btn-sm" onClick={()=>{setEditandoCotId(null);setLeadSelId("");}}>✕ Cancelar edición</button>
                    </div>
                  ):(
                    <button className="btn btn-p" onClick={guardarCot}>{I.check} Guardar cotización</button>
                  )}
                  <button className="btn btn-s btn-sm" onClick={()=>setTab("analisis")}>⚡ Análisis IA</button>
                  <button className="btn btn-s btn-sm" onClick={descargarCotPDF}>{I.dl} Descargar PDF</button>
                </div>
              </div>
            </div>

            {/* Referencia de tarifas rápida */}
            <div className="card">
              <div style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5}}>Tarifas de referencia</div>
              <div style={{padding:"8px 14px",maxHeight:200,overflow:"auto"}}>
                {tarifas.slice(0,10).map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:"1px solid var(--bd)"}}>
                    <span style={{color:"var(--t2)",flex:1}}>{t.cargo}</span>
                    <span className="mono" style={{color:C.blue,fontWeight:600,minWidth:50,textAlign:"right"}}>{"$"}{t.usd.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{fontSize:10,color:"var(--t3)",marginTop:6,textAlign:"center",cursor:"pointer"}} onClick={()=>setModalTarifas(true)}>
                  Ver todas ({tarifas.length}) →
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- ANÁLISIS IA -- */}
      {tab==="analisis"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card">
            <div className="card-hd"><div className="ct">Resumen de cotización activa</div></div>
            <div style={{padding:"14px 16px"}}>
              {[
                {l:"Cliente",        v:cliente||"(sin especificar)"},
                {l:"Servicio",       v:servicio.substring(0,40)+(servicio.length>40?"…":"")},
                {l:"Costo personal", v:"$"+fi(costoPersonalUSD)},
                {l:"EPP y equipos",  v:"$"+fi(costoEppUSD)},
                {l:"Gastos",         v:"$"+fi(costoGastosUSD)},
                {l:"Precio venta",   v:"$"+fi(Math.round(precioVenta))},
                {l:"Margen real",    v:f1(margenReal)+"%"},
                {l:"Cuotas",         v:cuotas+" × $"+fi(cuotaAmt)},
              ].map((k,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--bd)",fontSize:12}}>
                  <span style={{color:"var(--t3)"}}>{k.l}</span>
                  <span style={{fontWeight:600,color:"var(--t1)"}}>{k.v}</span>
                </div>
              ))}
              <div style={{padding:"10px 0",display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                {margenReal<22&&<div style={{padding:"8px 10px",background:"rgba(226,75,74,.08)",border:"1px solid rgba(226,75,74,.2)",borderRadius:"var(--r)",fontSize:11,color:C.red}}>🔴 Margen bajo mínimo recomendado (22%)</div>}
                {margenReal>=22&&margenReal<30&&<div style={{padding:"8px 10px",background:"rgba(186,117,23,.08)",border:"1px solid rgba(186,117,23,.2)",borderRadius:"var(--r)",fontSize:11,color:C.amber}}>🟡 Margen bajo meta ISO 9001 (30%)</div>}
                {margenReal>=30&&<div style={{padding:"8px 10px",background:"rgba(29,158,117,.08)",border:"1px solid rgba(29,158,117,.2)",borderRadius:"var(--r)",fontSize:11,color:C.teal}}>🟢 Margen sobre meta ISO 9001</div>}
              </div>
              <button className="btn btn-p" style={{width:"100%",marginTop:8}} onClick={analizarIA} disabled={aiLoading}>
                {aiLoading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>Analizando…</span>:"⚡ Analizar con IA"}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><div className="ct">Análisis IA — Claude</div></div>
            <div style={{padding:"14px 16px",minHeight:300}}>
              {!aiAnalysis&&!aiLoading&&(
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--t3)"}}>
                  <div style={{fontSize:28,marginBottom:8}}>⚡</div>
                  <div style={{fontSize:13}}>Haz clic en "Analizar con IA" para obtener un diagnóstico de la cotización activa.</div>
                </div>
              )}
              {aiLoading&&(
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--t3)"}}>
                  <div style={{fontSize:28,marginBottom:8,animation:"pulse 1.5s ease-in-out infinite"}}>⚡</div>
                  <div style={{fontSize:13}}>Analizando con Claude…</div>
                </div>
              )}
              {aiAnalysis&&(
                <div style={{fontSize:13,color:"var(--t2)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{aiAnalysis}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// MÓDULO REQUERIMIENTOS — unifica 5 formularios en 1 flujo
// Ref: TIH-PR-02-FO-02, ATF-PR-01-FO-16, ATF-PR-01-FO-14, REH-PR-04-FO-01,
//      TIH-PR-02-FO-05 (Solicitud de Etiquetas)
// ==============================================================================
const EPP_CATALOGO = [
  // Protección cabeza
  {cat:"Cabeza",      item:"Casco Blanco"},
  {cat:"Cabeza",      item:"Casco Amarillo"},
  {cat:"Cabeza",      item:"Barbiquejo"},
  {cat:"Cabeza",      item:"Orejeras para casco"},
  // Protección visual/respiratoria
  {cat:"Visual",      item:"Lentes de seguridad"},
  {cat:"Visual",      item:"Cámara fotográfica"},
  {cat:"Visual",      item:"Mascarilla con filtro"},
  // Protección cuerpo
  {cat:"Cuerpo",      item:"Chaleco Plomo"},
  {cat:"Cuerpo",      item:"Chaleco Nexova"},
  {cat:"Cuerpo",      item:"Mandil Blanco"},
  {cat:"Cuerpo",      item:"Casaca Térmica"},
  {cat:"Cuerpo",      item:"Mameluco"},
  {cat:"Cuerpo",      item:"Polo Plomo"},
  {cat:"Cuerpo",      item:"Arnés + Línea de vida"},
  // Protección pies
  {cat:"Pies",        item:"Botas punta de acero"},
  {cat:"Pies",        item:"Botas dieléctricas"},
  {cat:"Pies",        item:"Botas de jebe"},
  {cat:"Pies",        item:"Camisa Oxford"},
  // Materiales
  {cat:"Materiales",  item:"Hojas Bond"},
  {cat:"Materiales",  item:"Wincha"},
  {cat:"Materiales",  item:"Lija"},
  {cat:"Materiales",  item:"Trapo industrial"},
  {cat:"Materiales",  item:"Lupa"},
  {cat:"Materiales",  item:"Espátula"},
  {cat:"Materiales",  item:"Loctite"},
];

const PERSONAL_CARGOS_REQ = [
  "Jefe de Proyecto",
  "Consultor Funcional",
  "Consultor Contable",
  "Supervisor de Inventario",
  "Asistente Contable",
  "Asistente de Inventario",
  "Perito Tasador",
  "Supervisor de Perito",
  "Coordinador SIG",
  "Jefe de TI",
  "Consultor de Sistemas",
  "Estibador",
];

  // -- Guardar cotización ------------------------------


function Requerimientos({proyectos, cotizaciones=[], toast, usuario, formInicial=null, modoEdicion=false, onGuardarEdicion=null}) {
  const canEdit = ["Admin","Jefe Proyecto","Operaciones"].includes(usuario.rol);
  const [tab, setTab] = useState(modoEdicion?"form":"lista");
  const [reqs, setReqs] = useState([]);
  const [modalNuevo, setModalNuevo] = useState(modoEdicion);
  const [paso, setPaso] = useState(1);

  // Formulario unificado
  const FORM_INIT = {
    // Datos generales
    proyectoId:"", proyectoNombre:"", cliente:"", area:"",
    descripcion:"", centroCostos:"", solicitante:usuario.nombre,
    fechaSolicitud:new Date().toLocaleDateString("es-PE"),
    fechaInicio:"", fechaFin:"",
    // Personal (REH-PR-04-FO-01)
    personal: PERSONAL_CARGOS_REQ.map((c,i)=>({id:i,cargo:c,cant:0,dias:0,horas:0,fechaInicio:"",fechaFin:""})),
    // Equipos TI (TIH-PR-02-FO-02)
    laptops:{cant:0, detalle:""},
    terminales:{cant:0, detalle:"", tipo:"manual", fechaEntrega:"", fechaDev:""},
    sitia:{req:false, cant:0},
    sicex:{req:false, cant:0},
    msoffice:{req:false},
    otroSoftware:"",
    // Etiquetas (TIH-PR-02-FO-05)
    etiquetasPoliester:{cant:0, tipo:"codigo_barras"},
    etiquetasPapel:{cant:0, tipo:"codigo_barras"},
    protectores:{cant:0},
    fechaEntregaEquipos:"",
    fechaDevolucion:"",
    comentariosEquipos:"",
    placas:{placaA234:0,placaA21:0,placaB234:0,placaB21:0},
    // EPP/Materiales (ATF-PR-01-FO-16)
    epp: EPP_CATALOGO.map((e,i)=>({id:i, cat:e.cat, item:e.item, cant:0, talla:"", tallas:[]})),
    // Fondo/Viáticos (ATF-PR-01-FO-14)
    viaticos:[
      {id:1, concepto:"Pasajes (ida y vuelta)", cant:0, personas:0, monto:0, dias:0},
      {id:2, concepto:"Alojamiento", cant:0, personas:0, monto:0, dias:0},
      {id:3, concepto:"Alimentación diaria", cant:0, personas:0, monto:0, dias:0},
      {id:4, concepto:"Movilidad local", cant:0, personas:0, monto:0, dias:0},
      {id:5, concepto:"Materiales y útiles", cant:0, personas:0, monto:0, dias:0},
    ],
    destino:"", oficina:"",
    notas:"",
  };
  const [form, setForm] = useState(formInicial||FORM_INIT);

  const updForm = (field, val) => setForm(f=>({...f,[field]:val}));
  const updPersonal = (id,field,val) => setForm(f=>({...f,personal:f.personal.map(p=>p.id===id?{...p,[field]:field==="cant"||field==="dias"||field==="horas"?parseInt(val)||0:val}:p)}));
  const updEpp = (id,field,val) => setForm(f=>({...f,epp:f.epp.map(e=>e.id===id?{...e,[field]:field==="cant"?parseInt(val)||0:val}:e)}));
  const updViatico = (id,field,val) => setForm(f=>({...f,viaticos:f.viaticos.map(v=>v.id===id?{...v,[field]:parseFloat(val)||0}:v)}));
  const addViatico = () => setForm(f=>({...f,viaticos:[...f.viaticos,{id:Date.now(),concepto:"",cant:0,personas:0,monto:0,dias:0}]}));

  const totalViaticos = form.viaticos.reduce((a,v)=>a+(v.personas*v.monto*Math.max(v.dias,1)),0);
  const totalPersonal = form.personal.filter(p=>p.cant>0).length;
  const totalEpp = form.epp.filter(e=>e.cant>0).length;

  const guardarReq = () => {
    if(!form.proyectoNombre.trim()){toast("Ingresa el nombre del proyecto","error");return;}
    if(modoEdicion && onGuardarEdicion){
      onGuardarEdicion(form);
      toast("✓ Requerimiento actualizado","success");
      return;
    }
    const nuevo = {
      id:"REQ-"+String(Date.now()).slice(-6),
      ...form,
      estado:"propuesta",
      fechaCreacion:new Date().toLocaleDateString("es-PE"),
      creadoPor:usuario.nombre,
    };
    setReqs(prev=>[nuevo,...prev]);
    toast("✓ Requerimiento "+nuevo.id+" guardado","success");
    setModalNuevo(false);
    setPaso(1);
    setForm(FORM_INIT);
  };

  const generarPDFReq = (r) => {
    // Tabla de personal
    const persFiltered = (r.personal||[]).filter(p=>p.cant>0);
    const tabPersonal = persFiltered.length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Cargo</th><th style="padding:7px 10px;text-align:right">Personas</th><th style="padding:7px 10px;text-align:right">Días</th><th style="padding:7px 10px;text-align:right">Horas/día</th></tr>'+
        persFiltered.map((p,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600">'+p.cargo+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">'+p.cant+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">'+p.dias+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">'+p.horas+'h</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin personal solicitado</div>';
    // Tabla EPP
    const eppFiltered = (r.epp||[]).filter(e=>e.cant>0);
    const tabEPP = eppFiltered.length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Ítem EPP</th><th style="padding:7px 10px;text-align:right">Cant.</th><th style="padding:7px 10px">Talla</th></tr>'+
        eppFiltered.map((e,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+e.item+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">'+e.cant+'</td><td style="padding:6px 10px;color:#64748b">'+(e.talla||"—")+'</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin EPP solicitado</div>';
    // Tabla viáticos
    const viatFiltered = (r.viaticos||[]).filter(v=>(v.personas*v.monto)>0);
    const totalViat = viatFiltered.reduce((a,v)=>a+(v.personas*v.monto*Math.max(v.dias,1)),0);
    const tabViat = viatFiltered.length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Concepto</th><th style="padding:7px 10px;text-align:right">Personas</th><th style="padding:7px 10px;text-align:right">Monto S/</th><th style="padding:7px 10px;text-align:right">Días</th><th style="padding:7px 10px;text-align:right">Total S/</th></tr>'+
        viatFiltered.map((v,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+v.concepto+'</td><td style="padding:6px 10px;text-align:right">'+v.personas+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">'+fi(v.monto)+'</td><td style="padding:6px 10px;text-align:right">'+v.dias+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1D9E75">S/ '+fi(v.personas*v.monto*Math.max(v.dias,1))+'</td></tr>').join('')+
        '<tr style="background:#f0fdf9"><td colspan="4" style="padding:7px 10px;font-weight:700;text-align:right">TOTAL VIÁTICOS</td><td style="padding:7px 10px;text-align:right;font-family:monospace;font-weight:900;color:#1D9E75;font-size:12px">S/ '+fi(totalViat)+'</td></tr>'+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin fondo de viáticos</div>';
    // Info del proyecto
    const infoProy = '<table style="width:100%;border-collapse:collapse;font-size:11px">'+
      [["Proyecto",r.proyectoNombre||"—"],["Cliente",r.cliente||"—"],["Área",r.area||"—"],["Destino",r.destino||"—"],["Fecha solicitud",r.fechaSolicitud||"—"],["Solicitante",r.solicitante||"—"]].map(([k,v],i)=>
        '<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600;color:#64748b;width:160px">'+k+'</td><td style="padding:6px 10px;font-weight:500">'+v+'</td></tr>'
      ).join('')+'</table>';
    generarPDFRico({
      nombre: "Requerimiento_"+(r.id||"REQ")+"_"+(r.proyectoNombre||"").replace(/[^a-zA-Z0-9]/g,"_"),
      titulo: "Requerimiento de Recursos — "+r.id,
      subtitulo: (r.proyectoNombre||"—")+" · "+(r.cliente||"—")+" · "+(r.fechaSolicitud||new Date().toLocaleDateString("es-PE")),
      kpis:[
        {label:"Personal solicitado",  value:persFiltered.reduce((a,p)=>a+p.cant,0)+" personas",   color:"#1a2e4a"},
        {label:"EPP items",            value:eppFiltered.length+" ítems",                             color:"#4a9fd4"},
        {label:"Fondo viáticos",       value:"S/ "+fi(totalViat),                                     color:"#1D9E75"},
        {label:"Destino",              value:r.destino||"Lima",                                       color:"#BA7517"},
      ],
      secciones:[
        {titulo:"Datos del Proyecto",    contenido:infoProy},
        {titulo:"Personal Requerido",    contenido:tabPersonal},
        {titulo:"EPP y Materiales",      contenido:tabEPP},
        {titulo:"Fondo de Viáticos",     contenido:tabViat},
      ],
      analisis:{
        situacion:"Requerimiento <strong>"+(r.id||"REQ")+"</strong> para el proyecto <strong>"+(r.proyectoNombre||"—")+"</strong> — cliente <strong>"+(r.cliente||"—")+"</strong>. Personal: <strong>"+persFiltered.reduce((a,p)=>a+p.cant,0)+" personas</strong>. Fondo viáticos: <strong>S/ "+fi(totalViat)+"</strong>.",
        recomendaciones:"<strong>1.</strong> Verificar disponibilidad del personal antes de confirmar.<br/><strong>2.</strong> Gestionar EPP con al menos 3 días de anticipación al inicio.<br/><strong>3.</strong> Tramitar fondos de viáticos con área de finanzas.<br/><strong>4.</strong> Confirmar SCTR para personal que va a campo.",
      }
    });
    toast("✓ Requerimiento PDF generado","success");
  };

  const PASOS = [
    {n:1, lbl:"Proyecto"},
    {n:2, lbl:"Personal"},
    {n:3, lbl:"Equipos"},
    {n:4, lbl:"EPP"},
    {n:5, lbl:"Viáticos"},
  ];

  const eppPorCat = EPP_CATALOGO.reduce((acc,e)=>{
    if(!acc[e.cat]) acc[e.cat]=[];
    acc[e.cat].push(e);
    return acc;
  },{});

  return(
    <div>
      {/* Modal nuevo requerimiento */}
      {modalNuevo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget){setModalNuevo(false);setPaso(1);}}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:700,maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            {/* Header */}
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"var(--card)",zIndex:10}}>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{modoEdicion?"Editar Requerimiento Integral":"Nuevo Requerimiento Integral"}</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>TIH-PR-02-FO-02 + ATF-PR-01-FO-16 + ATF-PR-01-FO-14 + REH-PR-04-FO-01</div>
              </div>
              <button onClick={()=>{setModalNuevo(false);setPaso(1);}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>x</button>
            </div>

            {/* Pasos */}
            <div style={{display:"flex",padding:"12px 20px",gap:0,borderBottom:"1px solid var(--bd)"}}>
              {PASOS.map((p,i)=>(
                <div key={p.n} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div onClick={()=>setPaso(p.n)} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",opacity:paso===p.n?1:.6}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:paso>=p.n?C.blue:"var(--bd)",color:paso>=p.n?"#fff":"var(--t3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{p.n}</div>
                    <span style={{fontSize:11,fontWeight:paso===p.n?700:500,color:paso===p.n?"var(--t1)":"var(--t3)"}}>{p.lbl}</span>
                  </div>
                  {i<PASOS.length-1&&<div style={{flex:1,height:1,background:"var(--bd)",margin:"0 8px"}}/>}
                </div>
              ))}
            </div>

            <div style={{padding:"20px"}}>
              {/* PASO 1: Datos del proyecto */}
              {paso===1&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:.5}}>Datos del proyecto</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><label className="fl">Proyecto *</label>
                      <select value={form.proyectoId} onChange={e=>{
                        const p=proyectos.find(x=>x.id===e.target.value);
                        updForm("proyectoId",e.target.value);
                        if(p){
                          updForm("proyectoNombre",p.proyecto);
                          updForm("cliente",p.cliente);
                          // R1.2 — buscar cotización del cliente (ganado o avanzado)
                          const cot=cotizaciones.find(c=>["ganado","propuesta","calificado"].includes(c.estado)&&c.cliente===p.cliente&&(c.personal||[]).length>0);
                          if(cot&&cot.personal&&cot.personal.length>0){
                            // Personal directo de la cotización con cant y días reales
                            const cotPersonal=cot.personal.map((cp,idx)=>({
                              id:idx,cargo:cp.cargo,cant:cp.cant||1,
                              dias:Math.round((cp.horas||0)/8),
                              horas:8,fechaInicio:"",fechaFin:"",desdeCot:true
                            }));
                            // Cargos estándar no cubiertos por la cotización (cant=0)
                            const cargosCot=cotPersonal.map(p=>p.cargo.toLowerCase());
                            const extras=PERSONAL_CARGOS_REQ
                              .filter(c=>!cargosCot.some(cc=>cc.includes(c.toLowerCase().split(" ")[0])))
                              .map((cargo,i)=>({id:cotPersonal.length+i,cargo,cant:0,dias:0,horas:8,fechaInicio:"",fechaFin:"",desdeCot:false}));
                            setForm(f=>({...f,
                              proyectoId:e.target.value,
                              proyectoNombre:p.proyecto,
                              cliente:p.cliente,
                              personal:[...cotPersonal,...extras]
                            }));
                          }
                        }
                      }}>
                        <option value="">-- Seleccionar proyecto --</option>
                        {proyectos.map(p=><option key={p.id} value={p.id}>{p.id} - {p.cliente}</option>)}
                        <option value="nuevo">+ Proyecto nuevo (manual)</option>
                      </select>
                    </div>
                    <div><label className="fl">Nombre del proyecto</label><input value={form.proyectoNombre} onChange={e=>updForm("proyectoNombre",e.target.value)} placeholder="Inventario AF — Sede Lima"/></div>
                    <div><label className="fl">Cliente</label><input value={form.cliente} onChange={e=>updForm("cliente",e.target.value)} placeholder="Nombre del cliente"/></div>
                    <div><label className="fl">Área / Unidad</label><input value={form.area} onChange={e=>updForm("area",e.target.value)} placeholder="Ej: Activos Fijos"/></div>
                    <div><label className="fl">Centro de costos</label><input value={form.centroCostos} onChange={e=>updForm("centroCostos",e.target.value)} placeholder="CC-001"/></div>
                    <div><label className="fl">Solicitante</label><input value={form.solicitante} onChange={e=>updForm("solicitante",e.target.value)}/></div>
                    <div><label className="fl">Fecha de inicio</label><input type="date" value={form.fechaInicio} onChange={e=>updForm("fechaInicio",e.target.value)}/></div>
                    <div><label className="fl">Fecha de término</label><input type="date" value={form.fechaFin} onChange={e=>updForm("fechaFin",e.target.value)}/></div>
                  </div>
                  <div><label className="fl">Descripción del servicio</label><textarea value={form.descripcion} onChange={e=>updForm("descripcion",e.target.value)} rows={3} placeholder="Inventario y conciliación contable del activo fijo..." style={{resize:"vertical"}}/></div>
                </div>
              )}

              {/* PASO 2: Personal */}
              {paso===2&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Solicitud de personal (REH-PR-04-FO-01)</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead className="th-inv">
                      <tr style={{background:"#1a2e4a"}}>
                        {["Cargo","Cant.","Días","Horas/día","Fecha inicio","Fecha fin"].map(h=>(
                          <th key={h} style={{padding:"7px 10px",color:"#fff",fontWeight:600,textAlign:"left"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.personal.map((p,i)=>(
                        <tr key={p.id} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                          <td style={{padding:"5px 10px",fontWeight:500,color:"var(--t1)"}}>
                            <span>{p.cargo}</span>
                            {p.desdeCot&&<span style={{marginLeft:4,fontSize:9,background:C.teal+"20",color:C.teal,padding:"1px 5px",borderRadius:8,fontWeight:700}}>COT</span>}
                            {!p.desdeCot&&p.cant>0&&<span style={{marginLeft:4,fontSize:9,background:C.amber+"20",color:C.amber,padding:"1px 5px",borderRadius:8,fontWeight:700}}>+EXTRA</span>}
                          </td>
                          <td style={{padding:"4px 6px"}}><input type="number" min="0" value={p.cant||""} onChange={e=>updPersonal(p.id,"cant",e.target.value)} style={{width:60,textAlign:"center",fontSize:11}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="number" min="0" value={p.dias||""} onChange={e=>updPersonal(p.id,"dias",e.target.value)} style={{width:60,textAlign:"center",fontSize:11}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="number" min="0" value={p.horas||""} onChange={e=>updPersonal(p.id,"horas",e.target.value)} style={{width:60,textAlign:"center",fontSize:11}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="date" value={p.fechaInicio} onChange={e=>updPersonal(p.id,"fechaInicio",e.target.value)} style={{fontSize:10,width:120}}/></td>
                          <td style={{padding:"4px 6px"}}><input type="date" value={p.fechaFin} onChange={e=>updPersonal(p.id,"fechaFin",e.target.value)} style={{fontSize:10,width:120}}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{marginTop:10,padding:"8px 12px",background:"rgba(74,159,212,.06)",borderRadius:"var(--r)",fontSize:11,color:C.blue}}>
                    {totalPersonal} cargo(s) con personal asignado
                  </div>
                  {form.personal.some(p=>!p.desdeCot&&p.cant>0)&&(
                    <div style={{marginTop:8,padding:"8px 12px",background:"rgba(186,117,23,.08)",border:"1px solid rgba(186,117,23,.25)",borderRadius:"var(--r)",fontSize:11,color:"#BA7517",display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontWeight:700}}>⚠</span>
                      <span>El siguiente personal <strong>no estaba en la cotización original</strong>: {form.personal.filter(p=>!p.desdeCot&&p.cant>0).map(p=>p.cargo).join(", ")}. Verificar aprobación con Gerencia.</span>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: Equipos y tecnología */}
              {paso===3&&(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:.5}}>Equipos y tecnología (TIH-PR-02-FO-02)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div className="card" style={{padding:14}}>
                      <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Hardware</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,width:160,color:"var(--t2)"}}>Laptops</span>
                          <input type="number" min="0" value={form.laptops.cant||""} onChange={e=>updForm("laptops",{...form.laptops,cant:parseInt(e.target.value)||0})} style={{width:50,textAlign:"center"}}/>
                          <input value={form.laptops.detalle} onChange={e=>updForm("laptops",{...form.laptops,detalle:e.target.value})} placeholder="Detalle / modelo" style={{flex:1,fontSize:11}}/>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,width:160,color:"var(--t2)"}}>Terminales Pocket PC</span>
                          <input type="number" min="0" value={form.terminales.cant||""} onChange={e=>updForm("terminales",{...form.terminales,cant:parseInt(e.target.value)||0})} style={{width:50,textAlign:"center"}}/>
                          <select value={form.terminales.tipo||"manual"} onChange={e=>updForm("terminales",{...form.terminales,tipo:e.target.value})} style={{fontSize:11,padding:"3px 6px",width:110}}>
                            <option value="manual">Manual</option>
                            <option value="rf">RF / Lector</option>
                            <option value="hibrido">Hibrido</option>
                          </select>
                          <input value={form.terminales.detalle} onChange={e=>updForm("terminales",{...form.terminales,detalle:e.target.value})} placeholder="Modelo" style={{flex:1,fontSize:11}}/>
                        </div>
                        {form.terminales.cant>0&&(
                          <div style={{display:"flex",gap:10,marginTop:6}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:11,color:"var(--t3)"}}>Entrega:</span>
                              <input type="date" value={form.terminales.fechaEntrega||""} onChange={e=>updForm("terminales",{...form.terminales,fechaEntrega:e.target.value})} style={{fontSize:11}}/>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:11,color:"var(--t3)"}}>Devolucion:</span>
                              <input type="date" value={form.terminales.fechaDev||""} onChange={e=>updForm("terminales",{...form.terminales,fechaDev:e.target.value})} style={{fontSize:11}}/>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card" style={{padding:14}}>
                      <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Software</div>
                      {[
                        {key:"sitia",lbl:"SITIA"},
                        {key:"sicex",lbl:"SICEX"},
                        {key:"msoffice",lbl:"Microsoft Office"},
                      ].map(s=>(
                        <div key={s.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <input type="checkbox" checked={s.key==="msoffice"?!!form[s.key]:!!(form[s.key]?.req)} onChange={e=>{
                            if(s.key==="msoffice") updForm(s.key,e.target.checked);
                            else updForm(s.key,{...form[s.key],req:e.target.checked});
                          }} style={{accentColor:C.blue}}/>
                          <span style={{fontSize:11,width:120,color:"var(--t2)"}}>{s.lbl}</span>
                          {s.key!=="msoffice"&&<input type="number" min="0" value={form[s.key]?.cant||""} onChange={e=>updForm(s.key,{...form[s.key],cant:parseInt(e.target.value)||0})} placeholder="Licencias" style={{width:70,fontSize:11}}/>}
                        </div>
                      ))}
                      <div style={{marginTop:6}}><label className="fl" style={{fontSize:10}}>Otro software</label><input value={form.otroSoftware} onChange={e=>updForm("otroSoftware",e.target.value)} placeholder="Nombre del software"/></div>
                    </div>
                  </div>
                  <div className="card" style={{padding:14}}>
                    <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Etiquetas y suministros (TIH-PR-02-FO-05)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                      {[
                        {key:"etiquetasPoliester",lbl:"Etiquetas Poliéster (millares)"},
                        {key:"etiquetasPapel",lbl:"Etiquetas Papel (millares)"},
                        {key:"protectores",lbl:"Protectores (millares)"},
                      ].map(e=>(
                        <div key={e.key}>
                          <label className="fl">{e.lbl}</label>
                          <input type="number" min="0" value={form[e.key]?.cant||form[e.key]||""} onChange={x=>{
                            if(e.key==="protectores") updForm(e.key,{cant:parseInt(x.target.value)||0});
                            else updForm(e.key,{...form[e.key],cant:parseInt(x.target.value)||0});
                          }}/>
                        </div>
                      ))}
                      <div style={{gridColumn:"1/-1",borderTop:"1px solid var(--bd)",paddingTop:8,marginTop:4}}>
                        <div style={{fontSize:11,fontWeight:700,color:"var(--t2)",marginBottom:6}}>Placas metalicas</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                          {["Acero inox 2x3/4","Acero inox 2x1","Aluminio 2x3/4","Aluminio 2x1"].map((lbl,idx)=>{
                            const key=["placaA234","placaA21","placaB234","placaB21"][idx];
                            return(
                              <div key={key}>
                                <label className="fl">{lbl}</label>
                                <input type="number" min="0"
                                  value={(form.placas&&form.placas[key])||""}
                                  onChange={e=>updForm("placas",Object.assign({},form.placas,{[key]:parseInt(e.target.value)||0}))}
                                  placeholder="0"/>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                      <div><label className="fl">Fecha límite entrega equipos</label><input type="date" value={form.fechaEntregaEquipos} onChange={e=>updForm("fechaEntregaEquipos",e.target.value)}/></div>
                      <div><label className="fl">Fecha devolución equipos</label><input type="date" value={form.fechaDevolucion} onChange={e=>updForm("fechaDevolucion",e.target.value)}/></div>
                    </div>
                    <div style={{marginTop:10}}><label className="fl">Comentarios</label><textarea value={form.comentariosEquipos} onChange={e=>updForm("comentariosEquipos",e.target.value)} rows={2} style={{resize:"vertical"}}/></div>
                  </div>
                </div>
              )}

              {/* PASO 4: EPP y materiales */}
              {paso===4&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>EPP y materiales (ATF-PR-01-FO-16)</div>
                  {Object.entries(eppPorCat).map(([cat,items])=>(
                    <div key={cat} style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:4,height:14,background:C.blue,borderRadius:2}}/>
                        {cat}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                        {items.map(item=>{
                          const eppItem = form.epp.find(e=>e.item===item.item);
                          if(!eppItem) return null;
                          const conTalla = cat==="Pies"||cat==="Cuerpo";
                          const tallaOpts = cat==="Cuerpo"
                            ?["XS","S","M","L","XL","XXL"]
                            :["35","36","37","38","39","40","41","42","43","44","45","46"];
                          return(
                            <div key={item.item} style={{padding:"6px 8px",background:"var(--hv)",borderRadius:"var(--r)"}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:conTalla?4:0}}>
                                {!conTalla&&<input type="number" min="0" value={eppItem.cant||""} onChange={e=>updEpp(eppItem.id,"cant",e.target.value)} style={{width:44,textAlign:"center",fontSize:11}} placeholder="0"/>}
                                <span style={{fontSize:11,color:"var(--t2)",flex:1,fontWeight:500}}>{item.item}</span>
                                {conTalla&&(
                                  <span style={{fontSize:10,color:"var(--t3)"}}>
                                    Total: {(eppItem.tallas||[]).reduce((a,t)=>a+(t.cant||0),0)} uds.
                                  </span>
                                )}
                                {conTalla&&(
                                  <button onClick={()=>{
                                    const newTallas=[...(eppItem.tallas||[]),{id:Date.now(),talla:"",cant:1}];
                                    setForm(f=>({...f,epp:f.epp.map(e=>e.id===eppItem.id?{...e,tallas:newTallas}:e)}));
                                  }} style={{fontSize:10,padding:"1px 7px",borderRadius:6,border:"1px solid "+C.blue,background:"transparent",color:C.blue,cursor:"pointer",fontWeight:700}}>+ Talla</button>
                                )}
                              </div>
                              {conTalla&&(eppItem.tallas||[]).map((t,ti)=>(
                                <div key={t.id||ti} style={{display:"flex",alignItems:"center",gap:6,marginTop:3,paddingLeft:8}}>
                                  <select value={t.talla||""} onChange={e=>{
                                    const nw=(eppItem.tallas||[]).map((x,xi)=>xi===ti?{...x,talla:e.target.value}:x);
                                    setForm(f=>({...f,epp:f.epp.map(e=>e.id===eppItem.id?{...e,tallas:nw}:e)}));
                                  }} style={{fontSize:10,padding:"2px 4px",width:cat==="Pies"?56:64,borderRadius:4}}>
                                    <option value="">Talla</option>
                                    {tallaOpts.map(opt=><option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                  <input type="number" min="1" value={t.cant||""} onChange={e=>{
                                    const nw=(eppItem.tallas||[]).map((x,xi)=>xi===ti?{...x,cant:parseInt(e.target.value)||1}:x);
                                    setForm(f=>({...f,epp:f.epp.map(e=>e.id===eppItem.id?{...e,tallas:nw}:e)}));
                                  }} style={{width:40,textAlign:"center",fontSize:11}} placeholder="1"/>
                                  <span style={{fontSize:10,color:"var(--t3)",flex:1}}>persona(s)</span>
                                  <button onClick={()=>{
                                    const nw=(eppItem.tallas||[]).filter((_,xi)=>xi!==ti);
                                    setForm(f=>({...f,epp:f.epp.map(e=>e.id===eppItem.id?{...e,tallas:nw}:e)}));
                                  }} style={{fontSize:11,color:C.red,background:"transparent",border:"none",cursor:"pointer",fontWeight:700,padding:"0 4px"}}>x</button>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{padding:"8px 12px",background:"rgba(74,159,212,.06)",borderRadius:"var(--r)",fontSize:11,color:C.blue}}>
                    {totalEpp} item(s) de EPP solicitados
                  </div>
                </div>
              )}

              {/* PASO 5: Viáticos y fondos */}
              {paso===5&&(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:.5}}>Fondo de viáticos (ATF-PR-01-FO-14)</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div><label className="fl">Destino / Ciudad</label><input value={form.destino} onChange={e=>updForm("destino",e.target.value)} placeholder="Ej: Lima - Trujillo"/></div>
                    <div><label className="fl">Oficina responsable</label><input value={form.oficina} onChange={e=>updForm("oficina",e.target.value)} placeholder="Lima / Trujillo / Piura"/></div>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead className="th-inv">
                      <tr style={{background:"#1a2e4a"}}>
                        {["Concepto","Personas","S/. por persona","Días","Total S/."].map(h=>(
                          <th key={h} style={{padding:"7px 10px",color:"#ffffff",fontWeight:600,textAlign:"left",fontSize:11,letterSpacing:.3}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.viaticos.map((v,i)=>(
                        <tr key={v.id} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                          <td style={{padding:"4px 8px"}}>
                            <input value={v.concepto} onChange={e=>setForm(f=>({...f,viaticos:f.viaticos.map(x=>x.id===v.id?{...x,concepto:e.target.value}:x)}))} style={{width:"100%",fontSize:11}}/>
                          </td>
                          {["personas","monto","dias"].map(field=>(
                            <td key={field} style={{padding:"4px 6px"}}>
                              <input type="number" min="0" value={v[field]||""} onChange={e=>updViatico(v.id,field,e.target.value)} style={{width:55,textAlign:"right",fontSize:11}}/>
                            </td>
                          ))}
                          <td style={{padding:"4px 8px",textAlign:"right",fontWeight:700,color:C.teal,fontSize:11}} className="mono">
                            {fi(v.personas*v.monto*Math.max(v.dias,1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"var(--navy)"}}>
                        <td colSpan={4} style={{padding:"8px 10px",color:"#fff",fontWeight:700,fontSize:12}}>TOTAL FONDO SOLICITADO</td>
                        <td style={{padding:"8px 10px",textAlign:"right",color:"#fff",fontWeight:800,fontSize:13}} className="mono">S/ {fi(totalViaticos)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <button className="btn btn-s btn-sm" style={{alignSelf:"flex-start"}} onClick={addViatico}>+ Agregar concepto</button>
                  <div><label className="fl">Notas adicionales</label><textarea value={form.notas} onChange={e=>updForm("notas",e.target.value)} rows={3} style={{resize:"vertical"}} placeholder="Observaciones, condiciones especiales..."/></div>
                </div>
              )}

              {/* Navegación entre pasos */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:"1px solid var(--bd)"}}>
                <button className="btn btn-s btn-sm" onClick={()=>setPaso(p=>Math.max(1,p-1))} disabled={paso===1}>Anterior</button>
                <div style={{display:"flex",gap:8}}>
                  {paso<5
                    ? <button className="btn btn-p btn-sm" onClick={()=>setPaso(p=>p+1)}>Siguiente</button>
                    : <button className="btn btn-p btn-sm" onClick={guardarReq}>{I.check} Guardar requerimiento</button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Requerimientos de Proyecto</div><div className="ss">{reqs.length} solicitudes registradas</div></div>
        {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>{setModalNuevo(true);setPaso(1);}}>{I.plus} Nuevo requerimiento</button>}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Total solicitudes",  v:reqs.length,                                     col:"blue"},
          {l:"Pendientes",         v:reqs.filter(r=>r.estado==="pendiente").length,    col:"amber"},
          {l:"Aprobados",          v:reqs.filter(r=>r.estado==="aprobado").length,     col:"teal"},
          {l:"Fondo total S/.",    v:"S/ "+fi(reqs.reduce((a,r)=>a+(r.viaticos?.reduce((x,v)=>x+(v.personas*v.monto*Math.max(v.dias,1)),0)||0),0)), col:"navy"},
        ].map((k,i)=><div key={i} className={"kpi "+k.col}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      {reqs.length===0&&(
        <div className="card" style={{padding:"48px 32px",textAlign:"center",color:"var(--t3)"}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Sin requerimientos registrados</div>
          <div style={{fontSize:12}}>Haz clic en "Nuevo requerimiento" para crear el primero.</div>
        </div>
      )}

      {reqs.length>0&&(
        <div className="card">
          <table>
            <thead>
              <tr><th>ID</th><th>Proyecto</th><th>Cliente</th><th>Personal</th><th>Equipos</th><th>Viáticos S/.</th><th>Estado</th><th>Creado</th><th></th></tr>
            </thead>
            <tbody>
              {reqs.map(r=>(
                <tr key={r.id}>
                  <td className="mono" style={{fontSize:11,color:C.blue,fontWeight:700}}>{r.id}</td>
                  <td style={{fontWeight:600,fontSize:12}}>{r.proyectoNombre}</td>
                  <td style={{fontSize:11,color:"var(--t2)"}}>{r.cliente}</td>
                  <td style={{textAlign:"center"}}><span className="pill blue">{r.personal?.filter(p=>p.cant>0).length} cargos</span></td>
                  <td style={{textAlign:"center",fontSize:11,color:"var(--t2)"}}>{(r.laptops?.cant||0)+"L "+(r.terminales?.cant||0)+"PC"}</td>
                  <td className="mono" style={{textAlign:"right",fontWeight:600,color:C.teal}}>{"S/ "+fi(r.viaticos?.reduce((a,v)=>a+(v.personas*v.monto*Math.max(v.dias,1)),0)||0)}</td>
                  <td><span className={"pill "+(r.estado==="aprobado"?"teal":r.estado==="rechazado"?"red":"amber")}>{r.estado}</span></td>
                  <td style={{fontSize:10,color:"var(--t3)"}}>{r.fechaCreacion}</td>
                  <td>
                    <div style={{display:"flex",gap:4}}>
                      <button className="btn btn-s btn-xs" onClick={()=>generarPDFReq(r)}>{I.dl} PDF</button>
                      {canEdit&&r.estado==="pendiente"&&<button className="btn btn-g btn-xs" onClick={()=>setReqs(prev=>prev.map(x=>x.id===r.id?{...x,estado:"ganado"}:x))}>Aprobar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const CONSULTORES_POOL = [
  {id:"C01",nombre:"Carlos Quispe",    cargo:"Jefe de Proyecto",          horas_sem:40,disponible:false,proyectos:["000004266","000004241"],color:"#4a9fd4"},
  {id:"C02",nombre:"María López",      cargo:"Consultora Senior",          horas_sem:40,disponible:false,proyectos:["000004258"],            color:"#1D9E75"},
  {id:"C03",nombre:"Ana Torres",       cargo:"Consultora",                 horas_sem:40,disponible:true, proyectos:[],                       color:"#BA7517"},
  {id:"C04",nombre:"Luis Gómez",       cargo:"Consultor Contable",         horas_sem:40,disponible:true, proyectos:[],                       color:"#9333ea"},
  {id:"C05",nombre:"Rosa Mendoza",     cargo:"Especialista Inventarios",   horas_sem:40,disponible:false,proyectos:["000004266"],            color:"#E24B4A"},
  {id:"C06",nombre:"Jorge Paredes",    cargo:"Consultor Jr.",              horas_sem:32,disponible:true, proyectos:[],                       color:"#0d2a4e"},
  {id:"C07",nombre:"Lucía Vargas",     cargo:"Consultora",                 horas_sem:40,disponible:false,proyectos:["000004241"],            color:"#1E293B"},
  {id:"C08",nombre:"Pedro Vargas",     cargo:"Ejecutivo Comercial",        horas_sem:40,disponible:true, proyectos:[],                       color:"#64748b"},
  {id:"C09",nombre:"Diana Castillo",   cargo:"Consultora Senior",          horas_sem:40,disponible:true, proyectos:[],                       color:"#4a9fd4"},
];

// ─── Formulario inline de Nueva Solicitud ─────────────────────────────────
function Recursos({toast,usuario,proyectos}) {
  const canEdit=["Admin","Operaciones","Jefe Proyecto","RRHH"].includes(usuario.rol);
  const [tab,setTab]=useState("solicitudes");
  const [modalNuevo,setModalNuevo]=useState(false);
  const [selId,setSelId]=useState("SOL-001");
  const [busq,setBusq]=useState("");
  const [filtEst,setFiltEst]=useState("todos");

  const [recursosData,setRecursosData]=useState([
    {id:"SOL-001",proy:"000004266",cliente:"Cía. Minera SIMSA",fecha:"20/03/2026",inicio:"2026-03-23",fin:"2026-06-23",estado:"ganado",
     personal:[{n:"Carlos Quispe",c:"Consultor Senior",h:524},{n:"María López",c:"Supervisor",h:176},{n:"Equipo Mina ×12",c:"Asistente Mina",h:1800}],
     epp:[{d:"EPP Mina ×14",cant:14,est:"entregado"},{d:"Etiquetas ×6",cant:6,est:"entregado"}],
     equipos:[{d:"Laptop",cant:2,est:"asignado"},{d:"Pocket PC",cant:4,est:"asignado"},{d:"Sistema SITIA",cant:1,est:"instalado"}],
     sctr:true,vac:true,exam:true,nota:"Todos los recursos en campo desde 23/Mar. Zona mina Morococha."},
    {id:"SOL-002",proy:"000004241",cliente:"Cía. Minera Poderosa",fecha:"28/01/2026",inicio:"2026-02-02",fin:"2026-04-30",estado:"ganado",
     personal:[{n:"Ana Torres",c:"Consultor Senior",h:400},{n:"Luis Gómez",c:"Supervisor",h:300},{n:"Equipo Mina ×8",c:"Asistente Mina",h:950}],
     epp:[{d:"EPP básico ×8",cant:8,est:"entregado"}],
     equipos:[{d:"Laptop",cant:2,est:"asignado"},{d:"Sistema SITIA",cant:1,est:"instalado"}],
     sctr:true,vac:true,exam:true,nota:"Proyecto en Pataz. Equipo completo desde Feb."},
    {id:"SOL-003",proy:"000004258",cliente:"Supermercados Peruanos",fecha:"01/04/2026",inicio:"2026-04-07",fin:"2026-06-30",estado:"propuesta",
     personal:[{n:"Por asignar",c:"Consultor Senior",h:600},{n:"Por asignar",c:"Supervisor",h:400},{n:"Equipo ×10",c:"Asistente Mina",h:1900}],
     epp:[{d:"EPP básico ×10",cant:10,est:"pendiente"}],
     equipos:[{d:"Laptop",cant:2,est:"pendiente"},{d:"Sistema SITIA",cant:1,est:"pendiente"}],
     sctr:false,vac:false,exam:false,nota:"Confirmar equipo antes del 07/Abr. Lima sede central."},
  ]);

  const EP={aprobado:"teal",pendiente:"amber",rechazado:"red"};
  const EC={entregado:C.teal,pendiente:C.amber,asignado:C.teal,instalado:C.blue,libre:C.teal};

  const filtradas = recursosData.filter(r=>{
    const matchBusq=!busq||r.cliente.toLowerCase().includes(busq.toLowerCase())||r.proy.includes(busq)||r.id.toLowerCase().includes(busq.toLowerCase());
    const matchEst=filtEst==="todos"||r.estado===filtEst;
    return matchBusq&&matchEst;
  });

  const sol=recursosData.find(r=>r.id===selId)||recursosData[0];

  const aprobar=(id)=>{setRecursosData(prev=>prev.map(r=>r.id===id?{...r,estado:"ganado"}:r));toast("✓ Solicitud aprobada","success");};
  const rechazar=(id)=>{setRecursosData(prev=>prev.map(r=>r.id===id?{...r,estado:"rechazado"}:r));toast("Solicitud rechazada","error");};
  const toggleDoc=(id,campo)=>{setRecursosData(prev=>prev.map(r=>r.id===id?{...r,[campo]:!r[campo]}:r));toast("✓ Documento actualizado","success");};
  const updateItemEst=(solId,tipo,idx,est)=>{
    setRecursosData(prev=>prev.map(r=>{
      if(r.id!==solId)return r;
      return{...r,[tipo]:r[tipo].map((x,i)=>i===idx?{...x,est}:x)};
    }));
    toast("✓ Estado actualizado","success");
  };

  // KPIs globales
  const totalPersonal=recursosData.flatMap(r=>r.personal).length;
  const eppPend=recursosData.flatMap(r=>r.epp).filter(e=>e.est==="pendiente").length;
  const docsPend=recursosData.filter(r=>!r.sctr||!r.vac||!r.exam).length;
  const cargaTotal=CONSULTORES_POOL.filter(c=>c.proyectos.length>0).length;

  return(
    <>
    <div>
      <div className="sh">
        <div><div className="st">Módulo Recursos</div><div className="ss">{recursosData.length} solicitudes · {CONSULTORES_POOL.filter(c=>c.disponible).length} consultores activos</div></div>
        <div style={{display:"flex",gap:8}}>
          {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalNuevo(true)}>{I.plus} Nuevo requerimiento</button>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Solicitudes activas",v:recursosData.filter(r=>r.estado!=="rechazado").length,col:"blue"},
          {l:"Personal en campo",  v:totalPersonal,col:"navy"},
          {l:"EPP pendiente",      v:eppPend,      col:eppPend>0?"amber":"teal"},
          {l:"Docs. incompletos",  v:docsPend,     col:docsPend>0?"red":"teal"},
          {l:"Consultores asign.", v:cargaTotal,   col:"blue"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      <Tabs tabs={[{id:"solicitudes",lbl:"Solicitudes"},{id:"disponibilidad",lbl:"Disponibilidad"},{id:"matriz",lbl:"Matriz de carga"}]} active={tab} onChange={setTab}/>

      {/* -- TAB SOLICITUDES -- */}
      {tab==="solicitudes"&&(
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,alignItems:"start"}}>
          {/* Lista */}
          <div className="card">
            <div className="card-hd">
              <div className="ct">Solicitudes</div>
              <select value={filtEst} onChange={e=>setFiltEst(e.target.value)} style={{fontSize:11,padding:"3px 7px",width:"auto"}}>
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
              </select>
            </div>
            <div style={{padding:"8px 12px",borderBottom:"1px solid var(--bd)"}}>
              <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Buscar proyecto o cliente…" style={{fontSize:11,padding:"5px 9px"}}/>
            </div>
            {filtradas.map(r=>(
              <div key={r.id} onClick={()=>setSelId(r.id)} style={{padding:"12px 14px",borderBottom:"1px solid var(--bd)",cursor:"pointer",background:selId===r.id?"rgba(74,159,212,.06)":"transparent",borderLeft:selId===r.id?`3px solid ${C.blue}`:"3px solid transparent",transition:"background .1s"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{r.id}</span>
                  <span className={`pill ${EP[r.estado]||"navy"}`}>{r.estado}</span>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:2}}>{r.cliente}</div>
                <div style={{fontSize:10,color:"var(--t3)",display:"flex",justifyContent:"space-between"}}>
                  <span>{r.fecha}</span>
                  <span>{r.personal.length} personas · {r.personal.reduce((a,p)=>a+p.h,0).toLocaleString()}h</span>
                </div>
                {/* Mini barra de docs */}
                <div style={{display:"flex",gap:3,marginTop:5}}>
                  {[["S",r.sctr],["V",r.vac],["E",r.exam]].map(([l,ok],i)=>(
                    <div key={i} style={{width:18,height:18,borderRadius:3,background:ok?"rgba(29,158,117,.15)":"rgba(226,75,74,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:ok?C.teal:C.red}}>{l}</div>
                  ))}
                  <span style={{fontSize:9,color:"var(--t3)",marginLeft:2,lineHeight:"18px"}}>SCTR·Vac·Examen</span>
                </div>
              </div>
            ))}
            {filtradas.length===0&&<div style={{padding:24,textAlign:"center",color:"var(--t3)",fontSize:12}}>Sin resultados</div>}
          </div>

          {/* Detalle */}
          {sol&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* Header solicitud */}
              <div className="card">
                <div className="card-hd">
                  <div>
                    <div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:2}}>{sol.id} · {sol.proy}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>{sol.cliente}</div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{sol.inicio&&sol.fin?`${sol.inicio} → ${sol.fin}`:sol.fecha}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    {sol.estado==="pendiente"&&canEdit&&(
                      <>
                        <button className="btn btn-g btn-sm" onClick={()=>aprobar(sol.id)}>{I.check} Aprobar</button>
                        <button className="btn btn-r btn-sm" onClick={()=>rechazar(sol.id)}>Rechazar</button>
                      </>
                    )}
                    <span className={`pill ${EP[sol.estado]||"navy"}`}>{sol.estado}</span>
                    <button className="btn btn-s btn-sm" onClick={()=>{
                      const tabPersonalR='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Nombre</th><th style="padding:7px 10px;text-align:left">Cargo</th><th style="padding:7px 10px;text-align:right">Horas</th></tr>'+(sol.personal||[]).map((p,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600">'+p.n+'</td><td style="padding:6px 10px;color:#64748b">'+p.c+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">'+p.h+'h</td></tr>').join('')+'</table>';
                      const tabEppR='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Ítem</th><th style="padding:7px 10px;text-align:right">Cant.</th><th style="padding:7px 10px">Estado</th></tr>'+(sol.epp||[]).map((e,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px">'+e.d+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">'+e.cant+'</td><td style="padding:6px 10px"><span style="padding:2px 7px;border-radius:8px;font-size:10px;font-weight:600;background:'+(e.est==="listo"?'rgba(29,158,117,.15)':'rgba(186,117,23,.15)')+';color:'+(e.est==="listo"?'#1D9E75':'#BA7517')+'">'+e.est+'</span></td></tr>').join('')+'</table>';
                      const docChecks='<div style="display:flex;gap:16px;flex-wrap:wrap;padding:12px;background:#f8fafc;border-radius:8px">'+[["SCTR",sol.sctr],["Vacunas",sol.vac],["Examen médico",sol.exam]].map(([k,v])=>'<div style="display:flex;align-items:center;gap:6px"><div style="width:20px;height:20px;border-radius:50%;background:'+(v?'#1D9E75':'#E24B4A')+';display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff">'+(v?'✓':'✕')+'</div><span style="font-size:11px;font-weight:600;color:#1e293b">'+k+'</span></div>').join('')+'</div>';
                      generarPDFRico({
                        nombre:"Recursos_"+sol.id,
                        titulo:"Solicitud de Recursos — "+sol.id,
                        subtitulo:sol.cliente+" · "+sol.proy+" · "+sol.fecha,
                        kpis:[
                          {label:"Personal",    value:(sol.personal||[]).length+" personas",color:"#1a2e4a"},
                          {label:"EPP items",   value:(sol.epp||[]).length+" ítems",       color:"#4a9fd4"},
                          {label:"Equipos",     value:(sol.equipos||[]).length+" equipos", color:"#1D9E75"},
                          {label:"Estado",      value:sol.estado?.toUpperCase()||"—",      color:"#BA7517"},
                        ],
                        secciones:[
                          {titulo:"Personal Asignado",    contenido:tabPersonalR},
                          {titulo:"EPP y Materiales",     contenido:tabEppR},
                          {titulo:"Documentos Requeridos",contenido:docChecks},
                          {titulo:"Notas",                contenido:'<div style="background:#f0f9ff;border-left:4px solid #4a9fd4;padding:12px;border-radius:0 8px 8px 0;font-size:11px;color:#1e293b">'+(sol.nota||"Sin notas.")+'</div>'},
                        ],
                        analisis:{
                          situacion:"Solicitud <strong>"+sol.id+"</strong> para <strong>"+sol.cliente+"</strong>. Personal: <strong>"+(sol.personal||[]).length+" personas</strong>. EPP: <strong>"+(sol.epp||[]).length+" ítems</strong>.",
                          riesgos:(!sol.sctr||!sol.vac||!sol.exam)?"Documentos pendientes: "+[!sol.sctr?"SCTR":null,!sol.vac?"Vacunas":null,!sol.exam?"Examen médico":null].filter(Boolean).join(", ")+". Gestionar antes del inicio.":undefined,
                          recomendaciones:"<strong>1.</strong> Verificar disponibilidad del personal antes de confirmar.<br/><strong>2.</strong> Gestionar EPP con 3 días de anticipación.<br/><strong>3.</strong> Asegurar documentos médicos y SCTR.",
                        }
                      });
                      toast("✓ PDF descargado","success");
                    }}>{I.dl} PDF</button>
                  </div>
                </div>
                <div style={{padding:"10px 16px",fontSize:12,color:"var(--t2)",borderBottom:"1px solid var(--bd)",fontStyle:"italic"}}>"{sol.nota}"</div>

                {/* Documentos interactivos */}
                <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Documentos de ingreso</div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                    {[["SCTR","sctr"],["Vacunas","vac"],["Examen médico","exam"]].map(([l,k])=>(
                      <div key={k} onClick={()=>canEdit&&toggleDoc(sol.id,k)}
                        style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:6,border:`1px solid ${sol[k]?C.teal+"40":"var(--bd)"}`,background:sol[k]?"rgba(29,158,117,.08)":"var(--bg)",cursor:canEdit?"pointer":"default",transition:"all .2s"}}>
                        <div style={{width:16,height:16,borderRadius:"50%",background:sol[k]?C.teal:"var(--bd)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:9,color:"#fff",fontWeight:700}}>{sol[k]?"✓":"✕"}</span>
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:sol[k]?C.teal:"var(--t2)"}}>{l}</span>
                      </div>
                    ))}
                    {canEdit&&<div style={{fontSize:10,color:"var(--t3)",alignSelf:"center",marginLeft:4}}>← Clic para marcar</div>}
                  </div>
                </div>
              </div>

              {/* Personal, EPP, Equipos */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div className="card">
                  <div className="card-hd"><div className="ct">Personal</div><div className="cs">{sol.personal.reduce((a,p)=>a+p.h,0).toLocaleString()}h total</div></div>
                  <table><thead><tr><th>Nombre</th><th>Cargo</th><th>Horas</th></tr></thead>
                  <tbody>{sol.personal.map((p,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{p.n}</td>
                      <td style={{fontSize:11,color:"var(--t2)"}}>{p.c}</td>
                      <td className="mono" style={{fontWeight:700,color:C.blue}}>{fi(p.h)}h</td>
                    </tr>
                  ))}</tbody></table>
                </div>

                <div className="card">
                  <div className="card-hd"><div className="ct">EPP</div>
                    {sol.epp.some(e=>e.est==="pendiente")&&<span className="pill amber">⚠ Pendiente</span>}
                  </div>
                  <table><thead><tr><th>EPP</th><th>Cant.</th><th>Estado</th></tr></thead>
                  <tbody>{sol.epp.map((e,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:11}}>{e.d}</td>
                      <td className="mono">{e.cant}</td>
                      <td>
                        {canEdit
                          ? <select value={e.est} onChange={ev=>updateItemEst(sol.id,"epp",i,ev.target.value)} style={{fontSize:10,padding:"2px 5px",width:"auto",color:EC[e.est]||"var(--t1)"}}>
                              {["pendiente","entregado","devuelto"].map(o=><option key={o}>{o}</option>)}
                            </select>
                          : <span style={{fontSize:10,fontWeight:700,color:EC[e.est]||"var(--t2)"}}>● {e.est}</span>
                        }
                      </td>
                    </tr>
                  ))}</tbody></table>
                </div>

                <div className="card">
                  <div className="card-hd"><div className="ct">Equipos</div>
                    {sol.equipos.some(e=>e.est==="pendiente")&&<span className="pill amber">⚠ Pendiente</span>}
                  </div>
                  <table><thead><tr><th>Equipo</th><th>Cant.</th><th>Estado</th></tr></thead>
                  <tbody>{sol.equipos.map((e,i)=>(
                    <tr key={i}>
                      <td style={{fontSize:11}}>{e.d}</td>
                      <td className="mono">{e.cant}</td>
                      <td>
                        {canEdit
                          ? <select value={e.est} onChange={ev=>updateItemEst(sol.id,"equipos",i,ev.target.value)} style={{fontSize:10,padding:"2px 5px",width:"auto",color:EC[e.est]||"var(--t1)"}}>
                              {["pendiente","asignado","instalado","devuelto"].map(o=><option key={o}>{o}</option>)}
                            </select>
                          : <span style={{fontSize:10,fontWeight:700,color:EC[e.est]||"var(--t2)"}}>● {e.est}</span>
                        }
                      </td>
                    </tr>
                  ))}</tbody></table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- TAB DISPONIBILIDAD -- */}
      {tab==="disponibilidad"&&(
        <div className="card">
          <div className="card-hd">
            <div><div className="ct">Pool de Consultores</div><div className="cs">{CONSULTORES_POOL.filter(c=>c.disponible).length} activos · {CONSULTORES_POOL.filter(c=>c.proyectos.length===0&&c.disponible).length} libres</div></div>
          </div>
          <table>
            <thead><tr><th>Consultor</th><th>Cargo</th><th>Horas/sem</th><th>Proyectos asignados</th><th>Carga</th><th>Estado</th></tr></thead>
            <tbody>
              {CONSULTORES_POOL.map(c=>{
                const cargaPct=c.proyectos.length===0?0:c.proyectos.length>=2?100:50;
                return(
                  <tr key={c.id}>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:c.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{c.nombre.split(" ").map(x=>x[0]).join("").substring(0,2)}</div>
                        <span style={{fontWeight:600,fontSize:12}}>{c.nombre}</span>
                      </div>
                    </td>
                    <td style={{fontSize:11,color:"var(--t2)"}}>{c.cargo}</td>
                    <td className="mono" style={{fontWeight:600}}>{c.horas_sem}h</td>
                    <td>
                      {c.proyectos.length===0
                        ? <span style={{fontSize:11,color:"var(--t3)"}}>—</span>
                        : c.proyectos.map(p=><span key={p} className="pill blue" style={{marginRight:3}}>{p}</span>)
                      }
                    </td>
                    <td style={{minWidth:120}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1}}><PBar pct={cargaPct} color={cargaPct>=100?C.red:cargaPct>=50?C.amber:C.teal}/></div>
                        <span className="mono" style={{fontSize:10,color:cargaPct>=100?C.red:cargaPct>=50?C.amber:C.teal,fontWeight:700,minWidth:28}}>{cargaPct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${!c.disponible?"navy":c.proyectos.length===0?"teal":c.proyectos.length>=2?"red":"amber"}`}>
                        {!c.disponible?"Inactivo":c.proyectos.length===0?"Disponible":c.proyectos.length>=2?"Sobrecargado":"En proyecto"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* -- TAB MATRIZ DE CARGA -- */}
      {tab==="matriz"&&(
        <div className="card">
          <div className="card-hd"><div><div className="ct">Matriz Consultor × Proyecto</div><div className="cs">Asignación actual — verde = asignado, gris = disponible</div></div></div>
          <div style={{overflowX:"auto"}}>
            <table style={{minWidth:600}}>
              <thead>
                <tr>
                  <th style={{minWidth:160}}>Consultor</th>
                  <th style={{fontSize:10}}>Cargo</th>
                  {[...new Set(CONSULTORES_POOL.flatMap(c=>c.proyectos)),...recursosData.filter(r=>r.estado==="pendiente").map(r=>r.proy)].filter((v,i,a)=>a.indexOf(v)===i).map(p=>(
                    <th key={p} style={{textAlign:"center",fontFamily:"var(--mono)",color:C.blue}}>{p.replace("0000","")}</th>
                  ))}
                  <th style={{textAlign:"center"}}>Carga</th>
                </tr>
              </thead>
              <tbody>
                {CONSULTORES_POOL.filter(c=>c.disponible).map(c=>{
                  const proyIds=[...new Set(CONSULTORES_POOL.flatMap(x=>x.proyectos)),...recursosData.filter(r=>r.estado==="pendiente").map(r=>r.proy)].filter((v,i,a)=>a.indexOf(v)===i);
                  const cargaPct=c.proyectos.length===0?0:c.proyectos.length>=2?100:50;
                  return(
                    <tr key={c.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <div style={{width:24,height:24,borderRadius:"50%",background:c.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,flexShrink:0}}>{c.nombre.split(" ").map(x=>x[0]).join("").substring(0,2)}</div>
                          <span style={{fontSize:12,fontWeight:600}}>{c.nombre}</span>
                        </div>
                      </td>
                      <td style={{fontSize:10,color:"var(--t3)"}}>{c.cargo}</td>
                      {proyIds.map(p=>(
                        <td key={p} style={{textAlign:"center"}}>
                          {c.proyectos.includes(p)
                            ? <div style={{width:28,height:28,borderRadius:4,background:"rgba(29,158,117,.15)",border:`1px solid ${C.teal}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                                <span style={{fontSize:12,color:C.teal}}>✓</span>
                              </div>
                            : <div style={{width:28,height:28,borderRadius:4,background:"var(--bg)",border:"1px solid var(--bd)",margin:"0 auto"}}/>
                          }
                        </td>
                      ))}
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:60}}><PBar pct={cargaPct} color={cargaPct>=100?C.red:cargaPct>=50?C.amber:C.teal} height={5}/></div>
                          <span style={{fontSize:10,fontFamily:"var(--mono)",color:cargaPct>=100?C.red:cargaPct>=50?C.amber:C.teal,fontWeight:700}}>{cargaPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
    {modalNuevo&&(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}}
      onClick={e=>{if(e.target===e.currentTarget)setModalNuevo(false);}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:520,maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:14,fontWeight:700}}>Nueva Solicitud de Recursos</div><div style={{fontSize:11,color:"var(--t3)"}}>Completa los datos para solicitar personal, EPP o equipos</div></div>
          <button onClick={()=>setModalNuevo(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
          <ModalNuevaSolicitudForm proyectos={proyectos} onSave={s=>{
            toast("✓ Solicitud creada","success");
            setModalNuevo(false);
          }} onClose={()=>setModalNuevo(false)} toast={toast}/>
        </div>
      </div>
    </div>
  )}
    </>
  );
}
// ==============================================================================
// CONTROL DE CALIDAD — Inventario Físico
// ==============================================================================
const TIPOS_ACTIVO = ["Maquinaria y equipo","Muebles y enseres","Vehículos","Equipo de cómputo","Instalaciones","Herramientas","Activos en tránsito","Otro"];
const CC_INIT = [
  {id:"CC-001",proy:"000004266",cliente:"Cía. Minera SIMSA",fecha:"2026-04-02",responsable:"Carlos Quispe",
   ubicacion:"Planta Morococha — Nivel 3",estado:"en_curso",avance:62,
   activos:[
     {id:"A001",codigo:"AF-001-2024",descripcion:"Compresor Atlas Copco GA90",tipo:"Maquinaria y equipo",serie:"AC2024-00391",marca:"Atlas Copco",modelo:"GA90",estado:"conforme",obs:"",foto:false},
     {id:"A002",codigo:"AF-002-2024",descripcion:"Generador Cummins 150KVA",tipo:"Maquinaria y equipo",serie:"CUM-150-2022",marca:"Cummins",modelo:"C150D5",estado:"conforme",obs:"",foto:false},
     {id:"A003",codigo:"AF-003-2024",descripcion:"Camioneta Toyota Hilux",tipo:"Vehículos",serie:"MNK125-0012345",marca:"Toyota",modelo:"Hilux 4x4",estado:"faltante",obs:"No localizado en zona asignada",foto:false},
     {id:"A004",codigo:"AF-004-2024",descripcion:"Laptop Dell Latitude 5520",tipo:"Equipo de cómputo",serie:"DELL-LAT-5520-001",marca:"Dell",modelo:"Latitude 5520",estado:"sobrante",obs:"Activo no figura en base contable",foto:false},
     {id:"A005",codigo:"AF-005-2024",descripcion:"Mesa de trabajo industrial",tipo:"Muebles y enseres",serie:"S/N",marca:"—",modelo:"—",estado:"conforme",obs:"",foto:true},
     {id:"A006",codigo:"AF-006-2024",descripcion:"Taladro Bosch GSB 20-2",tipo:"Herramientas",serie:"BSH-GSB-0021",marca:"Bosch",modelo:"GSB 20-2",estado:"deteriorado",obs:"Requiere mantenimiento preventivo",foto:false},
     {id:"A007",codigo:"AF-007-2024",descripcion:"Escritorio ejecutivo",tipo:"Muebles y enseres",serie:"S/N",marca:"—",modelo:"—",estado:"conforme",obs:"",foto:false},
     {id:"A008",codigo:"AF-008-2024",descripcion:"UPS APC 3000VA",tipo:"Equipo de cómputo",serie:"APC-3K-2023-88",marca:"APC",modelo:"SRT3000",estado:"conforme",obs:"",foto:false},
   ]
  },
  {id:"CC-002",proy:"000004241",cliente:"Cía. Minera Poderosa",fecha:"2026-03-28",responsable:"Ana Torres",
   ubicacion:"Sede Pataz — Almacén central",estado:"completado",avance:100,
   activos:[
     {id:"B001",codigo:"AF-P001-2023",descripcion:"Excavadora Caterpillar 320",tipo:"Maquinaria y equipo",serie:"CAT320-2023-001",marca:"Caterpillar",modelo:"320 GC",estado:"conforme",obs:"",foto:true},
     {id:"B002",codigo:"AF-P002-2023",descripcion:"Camión Volvo FMX",tipo:"Vehículos",serie:"VLV-FMX-2022-55",marca:"Volvo",modelo:"FMX 8x4",estado:"conforme",obs:"",foto:true},
     {id:"B003",codigo:"AF-P003-2023",descripcion:"Bomba de agua Grundfos",tipo:"Maquinaria y equipo",serie:"GRF-CM5-2021",marca:"Grundfos",modelo:"CM5-A",estado:"deteriorado",obs:"Sello mecánico desgastado",foto:false},
   ]
  },
];

// ==============================================================================
// PRESUPUESTO — Control Real vs Cotizado
// ==============================================================================

function Presupuesto({proyectos, toast, cotizaciones}) {
  const [selProy, setSelProy] = useState(proyectos[0]?.id||null);
  const proy = proyectos.find(p=>p.id===selProy)||proyectos[0];

  if(!proy) return (
    <div className="card" style={{textAlign:"center",padding:48}}>
      <div style={{fontSize:32,marginBottom:12}}>📊</div>
      <div style={{fontWeight:700,color:"var(--t1)"}}>Sin proyectos activos</div>
      <div style={{color:"var(--t3)",marginTop:6}}>Crea un proyecto para ver el control presupuestal</div>
    </div>
  );

  // Obtener cotización vinculada al proyecto
  const cotVincPres = (cotizaciones||[]).find(c=>
    c.id===proy.cotizacionId || c.cliente===proy.cliente
  );
  // Calcular costos cotizados desde la cotización real
  const costPersonalCot = cotVincPres
    ? (cotVincPres.personal||[]).reduce((a,p)=>a+(p.cant||1)*(p.horas||0)*(p.tarifa||0),0)
    : Math.round(proy.valor*0.45);
  const costEppCot = cotVincPres
    ? (cotVincPres.epp||[]).reduce((a,e)=>a+(e.total||e.costo||0),0)
    : Math.round(proy.valor*0.08);
  const costGastosCot = cotVincPres
    ? (cotVincPres.gastos||[]).reduce((a,g)=>a+(parseFloat(g.usd)||0),0)
    : Math.round(proy.valor*0.10);
  const costoTotalCot = costPersonalCot + costEppCot + costGastosCot;
  const margenCot = costoTotalCot>0 ? Math.round(((proy.valor-costoTotalCot)/proy.valor)*100) : 0;
  // Costos reales del proyecto (basados en horas reales)
  const pctEjecH = proy.horasCot>0 ? proy.horasReal/proy.horasCot : 0;
  const costPersonalReal = Math.round(costPersonalCot * pctEjecH);
  const costEppReal  = Math.round(costEppCot * (proy.avance/100));
  const costGastosReal = Math.round(costGastosCot * (proy.avance/100));
  const costoTotalReal = costPersonalReal + costEppReal + costGastosReal;
  const margenReal2 = costoTotalReal>0 ? Math.round(((proy.cobrado-costoTotalReal)/Math.max(proy.cobrado,1))*100) : 0;
  const rubros = proy.rubros || [
    {rubro:"Personal profesional",  cotizado:costPersonalCot, real:costPersonalReal, comp:Math.round(pctEjecH*100)},
    {rubro:"EPP y materiales",       cotizado:costEppCot,      real:costEppReal,      comp:proy.avance},
    {rubro:"Gastos de campo",        cotizado:costGastosCot,   real:costGastosReal,   comp:proy.avance},
    {rubro:"Margen / utilidad",      cotizado:Math.round(proy.valor-costoTotalCot), real:Math.round(proy.cobrado-costoTotalReal), comp:pctEjecH>0?Math.round((proy.cobrado-costoTotalReal)/(proy.valor-costoTotalCot)*100):0},
  ];

  const totalCot = rubros.reduce((a,r)=>a+r.cotizado,0);
  const totalReal = rubros.reduce((a,r)=>a+r.real,0);
  const variacion = totalReal - totalCot;
  const pctEjec = totalCot>0?Math.round(totalReal/totalCot*100):0;
  const maxVal = Math.max(...rubros.map(r=>Math.max(r.cotizado,r.real)),1);

  const semaforo = pctEjec<=90?"#1D9E75":pctEjec<=100?"#BA7517":"#E24B4A";
  const semaforoLbl = pctEjec<=90?"Bajo presupuesto":pctEjec<=100?"En presupuesto":"Sobre presupuesto";

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">Control Presupuestal</div>
          <div className="ss">Real vs. Cotizado · variaciones por rubro</div>
        </div>
        <select className="sel" value={selProy||""} onChange={e=>setSelProy(e.target.value)}>
          {proyectos.map(p=><option key={p.id} value={p.id}>{p.id} — {p.cliente}</option>)}
        </select>
      </div>

      {/* Banner cotización vinculada */}
      {cotVincPres ? (
        <div style={{background:"rgba(29,158,117,.08)",border:"1px solid rgba(29,158,117,.2)",
          borderRadius:8,padding:"8px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:8,fontSize:11}}>
          <span style={{color:"#1D9E75",fontWeight:700}}>✅ Cotización vinculada:</span>
          <span style={{color:"var(--t2)"}}>
            {cotVincPres.id} · {cotVincPres.cliente} · ${fi(cotVincPres.venta||0)} USD
          </span>
          <span style={{color:"var(--t3)",marginLeft:"auto"}}>
            Margen cotizado: <strong style={{color:cotVincPres.margen>=30?"#1D9E75":cotVincPres.margen>=22?"#BA7517":"#E24B4A"}}>{cotVincPres.margen?.toFixed(1)||0}%</strong>
          </span>
        </div>
      ) : (
        <div style={{background:"rgba(186,117,23,.08)",border:"1px solid rgba(186,117,23,.2)",
          borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:11,color:"#BA7517"}}>
          ⚠️ <strong>Sin cotización vinculada</strong> — asigna una desde el módulo Rentabilidad para ver datos reales. Los valores mostrados son estimados.
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {lbl:"Valor contrato",  val:"$"+fi(proy.valor),     col:C.navy},
          {lbl:"Total cotizado",  val:"$"+fi(totalCot),       col:C.blue},
          {lbl:"Costo real",      val:"$"+fi(totalReal),      col:semaforo},
          {lbl:"Variación",       val:(variacion>0?"+":"")+fi(variacion), col:variacion<=0?"#1D9E75":"#E24B4A"},
        ].map(k=>(
          <div key={k.lbl} className="card" style={{textAlign:"center",padding:"14px 10px"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:"var(--t3)",marginBottom:4}}>{k.lbl}</div>
            <div style={{fontSize:20,fontWeight:800,color:k.col,fontFamily:"monospace"}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Semáforo */}
      <div className="card" style={{display:"flex",alignItems:"center",gap:16,padding:"12px 20px",marginBottom:16,borderLeft:`4px solid ${semaforo}`}}>
        <div style={{width:44,height:44,borderRadius:"50%",background:semaforo+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>
          {pctEjec<=90?"🟢":pctEjec<=100?"🟡":"🔴"}
        </div>
        <div>
          <div style={{fontWeight:700,color:semaforo}}>{semaforoLbl} — {pctEjec}% de ejecución presupuestal</div>
          <div style={{fontSize:12,color:"var(--t3)",marginTop:2}}>
            USD {fi(totalReal)} ejecutado de USD {fi(totalCot)} presupuestado · Margen real: {f1(proy.margen)}%
          </div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:11,color:"var(--t3)"}}>Avance proyecto</div>
          <div style={{fontSize:20,fontWeight:800,color:C.blue}}>{proy.avance}%</div>
        </div>
      </div>

      {/* Gráfica barras */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-hd"><div className="ct">Cotizado vs Real por Rubro</div></div>
        <div style={{padding:"12px 16px"}}>
          {rubros.map((r,i)=>{
            const wCot = Math.round((r.cotizado/maxVal)*100);
            const wReal = Math.round((r.real/maxVal)*100);
            const col = r.real<=r.cotizado?"#1D9E75":"#E24B4A";
            return (
              <div key={i} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{r.rubro}</span>
                  <span style={{fontSize:11,color:"var(--t3)",fontFamily:"monospace"}}>
                    Cot: ${fi(r.cotizado)} · Real: <span style={{color:col,fontWeight:700}}>${fi(r.real)}</span>
                    {r.real!==r.cotizado&&<span style={{color:col,marginLeft:4}}>({r.real>r.cotizado?"+":""}{fi(r.real-r.cotizado)})</span>}
                  </span>
                </div>
                <div style={{position:"relative",height:10,background:"var(--bd)",borderRadius:5,marginBottom:3}}>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",width:wCot+"%",background:C.blue+"60",borderRadius:5}}/>
                  <div style={{position:"absolute",left:0,top:0,height:"100%",width:wReal+"%",background:col,borderRadius:5}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="card">
        <div className="card-hd"><div className="ct">Detalle por Rubro</div></div>
        <table>
          <thead>
            <tr><th>Rubro</th><th style={{textAlign:"right"}}>Cotizado</th><th style={{textAlign:"right"}}>Real</th><th style={{textAlign:"right"}}>Variación</th><th style={{textAlign:"center"}}>% Ejec.</th><th style={{textAlign:"center"}}>Estado</th></tr>
          </thead>
          <tbody>
            {rubros.map((r,i)=>{
              const vari = r.real - r.cotizado;
              const pct = r.cotizado>0?Math.round(r.real/r.cotizado*100):0;
              const col = vari<=0?"#1D9E75":"#E24B4A";
              return (
                <tr key={i}>
                  <td style={{fontWeight:600}}>{r.rubro}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace"}}>${fi(r.cotizado)}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace",color:col,fontWeight:700}}>${fi(r.real)}</td>
                  <td style={{textAlign:"right",fontFamily:"monospace",color:col}}>{vari>0?"+":""}{fi(vari)}</td>
                  <td style={{textAlign:"center"}}>
                    <PBar v={pct} col={col}/>
                  </td>
                  <td style={{textAlign:"center"}}>
                    <span className={`pill ${vari<=0?"green":"red"}`}>{vari<=0?"OK":"Desvío"}</span>
                  </td>
                </tr>
              );
            })}
            <tr style={{fontWeight:800,background:"var(--surface)"}}>
              <td>TOTAL</td>
              <td style={{textAlign:"right",fontFamily:"monospace"}}>${fi(totalCot)}</td>
              <td style={{textAlign:"right",fontFamily:"monospace",color:semaforo}}>${fi(totalReal)}</td>
              <td style={{textAlign:"right",fontFamily:"monospace",color:variacion<=0?"#1D9E75":"#E24B4A"}}>{variacion>0?"+":""}{fi(variacion)}</td>
              <td style={{textAlign:"center",fontWeight:800,color:semaforo}}>{pctEjec}%</td>
              <td style={{textAlign:"center"}}><span className={`pill ${pctEjec<=100?"green":"red"}`}>{semaforoLbl}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalUpload({doc, onClose, onSave}) {
  const [archivo,setArchivo] = useState(null);
  const [nombre,setNombre]   = useState(doc?.nom||"");
  const fi = useRef(null);
  const manejar = f => { if(!f)return; setArchivo(f); if(!nombre)setNombre(f.name.replace(/\.[^.]+$/,"")); };
  const guardar = () => {
    if(!archivo&&!doc?.subido){toast&&toast("Selecciona un archivo","error");return;}
    onSave({nom:nombre||doc?.nom,subido:true,size:archivo?(archivo.size>1048576?(archivo.size/1048576).toFixed(1)+" MB":(archivo.size/1024).toFixed(0)+" KB"):"—",url:"#"});
    onClose();
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--card)",borderRadius:"var(--r)",width:420,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{doc?.nom||"Subir documento"}</div>
        <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>Formatos: PDF, Word, Excel, PPT, JPG, PNG</div>
        <div><label className="fl">Nombre del documento</label>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del archivo..."/>
        </div>
        <div style={{border:"2px dashed var(--bd)",borderRadius:"var(--r)",padding:20,textAlign:"center",cursor:"pointer",marginTop:12,transition:"border .15s"}}
          onClick={()=>fi.current?.click()}
          onDragOver={e=>{e.preventDefault();}}
          onDrop={e=>{e.preventDefault();manejar(e.dataTransfer.files[0]);}}>
          <input ref={fi} type="file" style={{display:"none"}} onChange={e=>manejar(e.target.files[0])}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png"/>
          {archivo
            ? <div style={{color:C.teal,fontWeight:600}}>📎 {archivo.name}</div>
            : <div style={{color:"var(--t3)"}}>📂 Arrastra o haz clic para seleccionar</div>}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-s" onClick={onClose}>Cancelar</button>
          <button className="btn btn-p" onClick={guardar} disabled={!archivo&&!doc?.subido}>{I.upload||"↑"} Cargar</button>
        </div>
      </div>
    </div>
  );
}

function Ejecucion({proyectos,setProyectos,toast,usuario,cotizaciones=[]}) {
  // -- Filtro de visibilidad por rol --------------------------------------
  const esAdminEj = ["Admin","Gerencia","Finanzas","Operaciones"].includes(usuario?.rol);
  const proyVisEj = esAdminEj ? proyectos
    : usuario?.rol==="Jefe Proyecto"
      ? proyectos.filter(p=>p.jefe===usuario?.nombre)
      : proyectos.filter(p=>(p.personal||[]).some(pe=>(pe.nombre||pe.cargo||"")===usuario?.nombre));
  const [selId,setSelId]=useState(proyectos[0]?.id||"");
  const [tab,setTab]=useState("gantt");
  const [modalDoc,setModalDoc]=useState(null);
  const [modalAvance,setModalAvance]=useState(false);
  const [modalNuevoDoc,setModalNuevoDoc]=useState(false);
  const [avanceForm,setAvanceForm]=useState({faseId:"",pct:0,nota:""});
  const [nuevoDocForm,setNuevoDocForm]=useState({nom:"",tipo:"informe",archivo:null});
  const canEdit=["Admin","Jefe Proyecto","Operaciones"].includes(usuario.rol);
  const fi=n=>Number(n||0).toLocaleString("es-PE");
  const f1=n=>Number(n||0).toFixed(1);
  const fmtFecha=d=>{try{return new Date(d).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"});}catch{return d||"---";}};
  const pct=(a,b)=>b>0?Math.round(a/b*100):0;
  const N_SEM=9;
  const HOY_SEM=2.3;
  const EF={
    completada:{lbl:"Completada", pill:"teal",  dot:C.teal},
    en_curso:  {lbl:"En curso",   pill:"amber", dot:C.amber},
    pendiente: {lbl:"Pendiente",  pill:"navy",  dot:"var(--t3)"},
    atrasada:  {lbl:"Atrasada",   pill:"red",   dot:C.red},
  };
  const FASE_COLORS=[C.blue,C.teal,"#4a9fd4",C.navy,C.amber,"#9333ea",C.red,"#0891b2"];

  const proy=proyVisEj.find(p=>p.id===selId)||proyVisEj[0];
  // Cotización vinculada al proyecto para comparar horas
  const cotVinc = proy ? (cotizaciones||[]).find(c=>
    c.id===proy.cotizacionId || c.cliente===proy.cliente
  ) : null;
  // Si el proyecto no tiene personal propio, heredar de la cotización vinculada
  const personalEj = (proy?.personal&&proy.personal.length>0)
    ? proy.personal
    : cotVinc?.personal?.map(p=>({
        cargo:p.cargo, 
        cot:Math.round((p.cant||1)*(p.horas||0)), 
        real:0
      }))||[];
  if (!proy) return <div style={{padding:40,textAlign:"center",color:"var(--t3)"}}>Sin proyectos.</div>;

  const cobrado=proy.cobros.filter(c=>c.estado==="cobrado").reduce((a,b)=>a+b.monto,0);
  const pend   =proy.cobros.filter(c=>c.estado!=="cobrado").reduce((a,b)=>a+b.monto,0);
  const pctH   =pct(proy.horasReal,proy.horasCot);

  const toggleEnt=(faseId,entId)=>{
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      const nuevasFases=p.fases.map(f=>{
        if(f.id!==faseId) return f;
        const nuevosEnts=f.ents.map(e=>{
          if(e.id!==entId) return e;
          const nxt=e.est==="entregado"?"en_curso":"entregado";
          return {...e,est:nxt,arch:nxt==="entregado"};
        });
        const done=nuevosEnts.filter(e=>e.est==="entregado").length;
        const total=nuevosEnts.length;
        const nuevoAvance=total>0?Math.round(done/total*100):0;
        const nuevoEst=nuevoAvance===100?"completada":nuevoAvance>0?"en_curso":"pendiente";
        return {...f,ents:nuevosEnts,avance:nuevoAvance,estado:nuevoEst};
      });
      const avanceProy=nuevasFases.length>0
        ?Math.round(nuevasFases.reduce((a,f)=>a+(f.avance||0),0)/nuevasFases.length)
        :p.avance;
      return {...p,fases:nuevasFases,avance:avanceProy};
    }));
    toast("✓ Entregable actualizado — avance recalculado","success");
  };

  const guardarHoras=(cargo,valor)=>{
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      const totalReal=p.personal.reduce((a,per)=>a+(per.cargo===cargo?parseFloat(valor)||0:per.real),0);
      return {...p,horasReal:totalReal,personal:p.personal.map(per=>per.cargo===cargo?{...per,real:parseFloat(valor)||0}:per)};
    }));
    toast("Horas guardadas","success");
  };

  const marcarCobro=(n)=>{
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      const nuevoCobros=p.cobros.map(c=>c.n===n?{...c,estado:"cobrado"}:c);
      const nuevoCobrado=nuevoCobros.filter(c=>c.estado==="cobrado").reduce((a,b)=>a+b.monto,0);
      return {...p,cobros:nuevoCobros,cobrado:nuevoCobrado,pendiente:p.valor-nuevoCobrado};
    }));
    toast("✓ Cuota marcada como cobrada","success");
  };

  // Guarda documento cargado
  const guardarDoc=(docId, datos) => {
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      return {...p, documentos:(p.documentos||[]).map(d=>d.id===docId?{...d,...datos}:d)};
    }));
    toast("✓ Documento cargado exitosamente","success");
  };

  const guardarAvance = () => {
    if(!avanceForm.faseId){toast("Selecciona una fase","error");return;}
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      const fases = p.fases.map(f=>f.id===parseInt(avanceForm.faseId)?{...f,avance:parseInt(avanceForm.pct),estado:parseInt(avanceForm.pct)>=100?"completada":parseInt(avanceForm.pct)>0?"en_curso":"pendiente"}:f);
      const avanceGlobal = Math.round(fases.reduce((a,f)=>a+f.avance,0)/fases.length);
      return {...p,fases,avance:avanceGlobal};
    }));
    toast("✓ Avance actualizado — "+avanceForm.pct+"%","success");
    setModalAvance(false);
    setAvanceForm({faseId:"",pct:0,nota:""});
  };

  const agregarDoc = () => {
    if(!nuevoDocForm.nom.trim()){toast("Ingresa el nombre del documento","error");return;}
    const nuevoId = "D"+(Date.now()%10000);
    setProyectos(ps=>ps.map(p=>{
      if(p.id!==proy.id) return p;
      const docs = [...(p.documentos||[]),{id:nuevoId,nom:nuevoDocForm.nom,tipo:nuevoDocForm.tipo,subido:!!nuevoDocForm.archivo,fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),size:nuevoDocForm.archivo?"Local":"—",url:"#"}];
      return {...p,documentos:docs};
    }));
    toast("✓ Documento agregado al repositorio","success");
    setModalNuevoDoc(false);
    setNuevoDocForm({nom:"",tipo:"informe",archivo:null});
  };

  const descargarInforme = () => {
    const fecha=new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});
    const cobrado=proy.cobros.filter(c=>c.estado==="cobrado"||c.estado==="pagado").reduce((a,c)=>a+c.monto,0);
    const pendiente=proy.valor-cobrado;
    const pctH=proy.horasCot>0?Math.round(proy.horasReal/proy.horasCot*100):0;
    const eC={completada:"#1D9E75",en_curso:"#4a9fd4",pendiente:"#94a3b8",atrasada:"#E24B4A"};
    const gW=660,lW=210,rH=30,sems=9,gH=(proy.fases||[]).length*rH+40,tW=(gW-lW-14)/sems;
    let gantt='<svg xmlns="http://www.w3.org/2000/svg" width="'+gW+'" height="'+gH+'" style="font-family:sans-serif"><rect width="'+gW+'" height="'+gH+'" fill="#f8fafc" rx="6"/><rect width="'+gW+'" height="26" fill="#1a2e4a" rx="6"/>';
    gantt+='<text x="'+(lW/2)+'" y="17" fill="#fff" font-size="9" font-weight="700" text-anchor="middle">FASE</text>';
    for(let s=0;s<sems;s++) gantt+='<text x="'+(lW+7+s*tW+tW/2)+'" y="17" fill="#fff" font-size="9" text-anchor="middle">S'+(s+1)+'</text>';
    (proy.fases||[]).forEach((f,i)=>{
      const y=26+i*rH; const col=eC[f.estado]||"#94a3b8";
      gantt+='<rect x="0" y="'+y+'" width="'+gW+'" height="'+rH+'" fill="'+(i%2?"#f1f5f9":"#fff")+'"/>';
      gantt+='<text x="5" y="'+(y+18)+'" fill="#1a2e4a" font-size="9">F'+(f.id||i+1)+': '+((f.nombre||"Fase").substring(0,24))+'</text>';
      const s0=Math.max((f.semIni||f.semI||1)-1,0),sN=Math.max(f.semFin||f.semF||f.semIni||f.semI||1,s0+1);
      const bx=lW+7+s0*tW,bw=Math.max((sN-s0)*tW-4,tW*0.6);
      gantt+='<rect x="'+bx+'" y="'+(y+5)+'" width="'+bw+'" height="18" fill="'+col+'33" rx="3"/>';
      gantt+='<rect x="'+bx+'" y="'+(y+5)+'" width="'+(bw*(f.avance||0)/100)+'" height="18" fill="'+col+'" rx="3"/>';
      if(bw>22) gantt+='<text x="'+(bx+bw/2)+'" y="'+(y+17)+'" fill="#fff" font-size="8" font-weight="700" text-anchor="middle">'+(f.avance||0)+'%</text>';
    });
    gantt+='</svg>';
    const r2=44,cx=55,cy=55,ci=2*Math.PI*r2;
    const avProm=proy.fases.length>0?Math.round(proy.fases.reduce((a,f)=>a+(f.avance||0),0)/proy.fases.length):0;
    const pctCob=proy.valor>0?Math.round(cobrado/proy.valor*100):0;
    let dn='<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(avProm>=70?"#1D9E75":avProm>=40?"#4a9fd4":"#BA7517")+'" stroke-width="12" stroke-dasharray="'+(ci*avProm/100)+' '+(ci*(1-avProm/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1a2e4a" font-size="15" font-weight="800" text-anchor="middle">'+avProm+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">avance</text></svg>';
    let dnC='<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(pctCob>=70?"#1D9E75":"#BA7517")+'" stroke-width="12" stroke-dasharray="'+(ci*pctCob/100)+' '+(ci*(1-pctCob/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1a2e4a" font-size="15" font-weight="800" text-anchor="middle">'+pctCob+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">cobrado</text></svg>';
    const allEnts=(proy.fases||[]).flatMap(f=>(f.ents||[]).map(e=>({...e,faseId:f.id})));
    const tabEnts='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:6px 10px">Entregable</th><th style="padding:6px;text-align:center">Fase</th><th style="padding:6px;text-align:center">Estado</th><th style="padding:6px;text-align:center">Fecha</th></tr>'+allEnts.map((e,i)=>{const est=e.est||e.estado||"pendiente";const col=est==="entregado"||est==="subido"?"#166534":est==="revision"?"#1e40af":"#92400e";return'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:5px 10px">'+(e.nom||e.nombre||"—")+'</td><td style="padding:5px;text-align:center;color:#4a9fd4;font-weight:700;font-size:10px">F'+(e.faseId||"?")+'</td><td style="padding:5px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">'+est.toUpperCase()+'</span></td><td style="padding:5px;text-align:center;font-size:10px">'+(e.fecha||"—")+'</td></tr>';}).join('')+'</table>';
    const tabCobros='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:6px 10px">Cuota</th><th style="padding:6px;text-align:right">Monto USD</th><th style="padding:6px;text-align:center">Fecha</th><th style="padding:6px;text-align:center">Estado</th></tr>'+proy.cobros.map((c,i)=>{const col=c.estado==="cobrado"||c.estado==="pagado"?"#166534":c.estado==="vencido"?"#991b1b":"#92400e";return'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:5px 10px;font-weight:700">Cuota '+c.n+'</td><td style="padding:5px;text-align:right;font-family:monospace">$'+fi(c.monto)+'</td><td style="padding:5px;text-align:center;font-size:10px">'+fmtFecha(c.fecha)+'</td><td style="padding:5px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">'+c.estado.toUpperCase()+'</span></td></tr>';}).join('')+'</table>';
    const fasesComp=proy.fases.filter(f=>f.estado==="completada").length;
    const fasesRiesgo=proy.fases.filter(f=>f.estado==="atrasada");
    generarPDFRico({
      nombre:"Informe_"+proy.id+"_"+proy.cliente.replace(/[^a-zA-Z0-9]/g,"_"),
      titulo:"Informe de Avance de Proyecto",
      subtitulo:proy.id+" · "+proy.cliente+" · "+proy.proyecto,
      kpis:[{label:"Valor contrato",value:"$"+fi(proy.valor),color:"#1a2e4a"},{label:"Cobrado",value:"$"+fi(cobrado),color:"#1D9E75"},{label:"Pendiente",value:"$"+fi(pendiente),color:"#BA7517"},{label:"Avance",value:proy.avance+"%",color:proy.avance>=70?"#1D9E75":"#4a9fd4"},{label:"Margen",value:f1(proy.margen)+"%",color:proy.margen>=30?"#1D9E75":proy.margen>=22?"#4a9fd4":"#E24B4A"},{label:"Fases OK",value:fasesComp+"/"+proy.fases.length,color:"#1D9E75"},{label:"H. cotizadas",value:fi(proy.horasCot)+"h",color:"#64748b"},{label:"H. reales",value:fi(proy.horasReal)+"h ("+pctH+"%)",color:pctH>=90?"#E24B4A":"#1D9E75"}],
      secciones:[
        {titulo:"Gantt — Cronograma General",contenido:gantt+'<div style="display:flex;gap:12px;margin-top:6px;font-size:9px">'+[["#1D9E75","Completada"],["#4a9fd4","En ejecución"],["#94a3b8","Pendiente"],["#E24B4A","Atrasada"]].map(([c,l])=>'<span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:7px;background:'+c+';border-radius:2px;display:inline-block"></span>'+l+'</span>').join('')+'</div>'},
        {titulo:"Estado de Avance y Cobranza",contenido:'<div style="display:flex;gap:20px;align-items:center;margin-bottom:12px">'+dn+'<div style="font-size:12px;line-height:2.2"><b>Jefe de proyecto:</b> '+(proy.jefe||"Wilmer Moreno V.")+'<br/><b>Fase actual:</b> F'+proy.faseActual+'<br/><b>Inicio:</b> '+fmtFecha(proy.inicio)+' · <b>Fin:</b> '+fmtFecha(proy.fin)+'</div>'+dnC+'</div>'},
        {titulo:"Cronograma de Cobros",contenido:tabCobros},
        {titulo:"Entregables por Fase",contenido:allEnts.length>0?tabEnts:'<p style="color:#94a3b8;font-size:12px;padding:12px">Sin entregables registrados</p>'},
      ],
      analisis:{
        situacion:"El proyecto <strong>"+proy.proyecto+"</strong> para <strong>"+proy.cliente+"</strong> registra un avance del <strong>"+proy.avance+"%</strong>, con "+fasesComp+" de "+proy.fases.length+" fases completadas. Las horas reales representan el <strong>"+pctH+"%</strong> del presupuesto. Margen actual: <strong>"+f1(proy.margen)+"%</strong> "+(proy.margen>=30?"— supera el objetivo ISO 9001 (30%).":proy.margen>=22?"— en rango aceptable.":"— por debajo del mínimo aceptable."),
        logros:fasesComp>0?"Fases completadas: F"+proy.fases.filter(f=>f.estado==="completada").map(f=>f.id).join(", F")+". La cobranza efectiva es del "+pctCob+"% (USD "+fi(cobrado)+" de USD "+fi(proy.valor)+").":undefined,
        riesgos:fasesRiesgo.length>0?"<strong>"+fasesRiesgo.length+" fase(s) atrasada(s):</strong> "+fasesRiesgo.map(f=>"F"+f.id+" "+f.nombre).join(", ")+". Riesgo de incumplimiento de plazo.":(pctH>=90?"Horas reales al "+pctH+"% del presupuesto — riesgo de sobrecosto.":undefined),
        recomendaciones:"<strong>1.</strong> Emitir factura de la siguiente cuota al completar la fase en curso.<br/><strong>2.</strong> Mantener comunicación fluida con el cliente sobre el avance.<br/><strong>3.</strong> Revisar el Gantt semanalmente para anticipar desvíos.<br/><strong>4.</strong> Asegurar la entrega oportuna de la base contable para la fase contable.<br/><strong>5.</strong> Documentar todos los entregables en el repositorio del proyecto."
      }
    });
    toast("✓ Informe de avance generado","success");
  };

  const docActual = modalDoc ? (proy.documentos||[]).find(d=>d.id===modalDoc) : null;

  return (
    <div>
      {modalDoc && docActual && (
        <ModalUpload
          doc={docActual}
          onClose={()=>setModalDoc(null)}
          onSave={(datos)=>{ guardarDoc(modalDoc,datos); setModalDoc(null); }}
        />
      )}

      {/* Modal Registrar Avance */}
      {modalAvance&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalAvance(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>Registrar avance — {proy.cliente}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{proy.id}</div></div>
              <button onClick={()=>setModalAvance(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="fl">Fase *</label>
                <select value={avanceForm.faseId} onChange={e=>setAvanceForm(f=>({...f,faseId:e.target.value,pct:proy.fases.find(x=>x.id===parseInt(e.target.value))?.avance||0}))}>
                  <option value="">— Selecciona fase —</option>
                  {proy.fases.map(f=><option key={f.id} value={f.id}>Fase {f.id}: {f.nombre} (actual: {f.avance}%)</option>)}
                </select>
              </div>
              <div>
                <label className="fl">% de avance: <strong style={{color:C.blue}}>{avanceForm.pct}%</strong></label>
                <input type="range" min="0" max="100" step="5" value={avanceForm.pct} onChange={e=>setAvanceForm(f=>({...f,pct:parseInt(e.target.value)}))} style={{width:"100%",marginTop:6,accentColor:C.blue}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t3)",marginTop:3}}>
                  <span>0% — No iniciado</span><span>50% — En curso</span><span>100% — Completado</span>
                </div>
              </div>
              <div><label className="fl">Nota de avance</label><textarea value={avanceForm.nota} onChange={e=>setAvanceForm(f=>({...f,nota:e.target.value}))} rows={2} style={{resize:"vertical"}} placeholder="Observaciones del avance…"/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalAvance(false)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={guardarAvance}>{I.check} Guardar avance</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Documento */}
      {modalNuevoDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalNuevoDoc(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:460,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>Agregar documento al repositorio</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{proy.cliente} — {proy.id}</div></div>
              <button onClick={()=>setModalNuevoDoc(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
              <div><label className="fl">Nombre del documento *</label><input value={nuevoDocForm.nom} onChange={e=>setNuevoDocForm(f=>({...f,nom:e.target.value}))} placeholder="Ej: Cronograma detallado Fase 1"/></div>
              <div><label className="fl">Tipo</label>
                <select value={nuevoDocForm.tipo} onChange={e=>setNuevoDocForm(f=>({...f,tipo:e.target.value}))}>
                  {["informe","cronograma","acta","contrato","entregable","checklist","otro"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="fl">Archivo (opcional)</label>
                <div style={{border:"2px dashed var(--bd)",borderRadius:"var(--r)",padding:16,textAlign:"center",cursor:"pointer",background:"var(--bg)"}}
                  onClick={()=>document.getElementById("inputDocRepo").click()}>
                  <input id="inputDocRepo" type="file" style={{display:"none"}} onChange={e=>setNuevoDocForm(f=>({...f,archivo:e.target.files[0]}))}/>
                  {nuevoDocForm.archivo
                    ? <div style={{fontSize:12,color:C.teal,fontWeight:600}}>📎 {nuevoDocForm.archivo.name}</div>
                    : <div style={{fontSize:12,color:"var(--t3)"}}>📂 Haz clic para seleccionar archivo</div>
                  }
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalNuevoDoc(false)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={agregarDoc}>{I.check} Agregar al repositorio</button>
              </div>
            </div>
          </div>
        </div>
      )}
      )}
      <div className="sh">
        <div><div className="st">Módulo Ejecución</div><div className="ss">{proyectos.length} proyectos · cambios guardados automáticamente</div></div>
        
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Proyectos activos",     v:proyectos.length,col:"blue"},
          {l:"Valor total",           v:"$"+fi(proyectos.reduce((a,p)=>a+p.valor,0)),col:"navy"},
          {l:"Entregables pendientes",v:proyectos.flatMap(p=>p.fases.flatMap(f=>f.ents)).filter(e=>e.est!=="entregado").length,col:"amber"},
          {l:"Cuotas por cobrar",     v:"$"+fi(proyectos.flatMap(p=>p.cobros).filter(c=>c.estado!=="cobrado").reduce((a,b)=>a+b.monto,0)),col:"teal"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,alignItems:"start"}}>
        <div className="card" style={{position:"sticky",top:0}}>
          <div className="card-hd"><div className="ct">Proyectos</div></div>
          {proyectos.map(p=>(
            <div key={p.id} onClick={()=>{setSelId(p.id);setTab("gantt");}} style={{padding:"12px 14px",borderBottom:"1px solid var(--bd)",cursor:"pointer",background:selId===p.id?"rgba(74,159,212,.06)":"transparent",borderLeft:selId===p.id?`3px solid ${C.blue}`:"3px solid transparent",transition:"background .1s"}}>
              <div className="mono" style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:2}}>{p.id}</div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:4}}>{p.cliente}</div>
              <PBar pct={p.avance} color={p.avance>=80?C.teal:C.amber} height={4}/>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:2}}>{p.avance}% · {(p.fase||p.proyecto||"").substring(0,22)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="card">
            <div className="cb">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div><div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:2}}>{proy.id}</div><div style={{fontSize:16,fontWeight:800,color:"var(--t1)"}}>{proy.cliente}</div><div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>{proy.proyecto}</div></div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button className="btn btn-s btn-sm" onClick={descargarInforme}>{I.dl} PDF Informe</button>
                  <div className="mono" style={{fontSize:20,fontWeight:800,color:C.blue}}>{"$"+fi(proy.valor)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
                {[{l:"Avance",v:proy.avance+"%",c:proy.avance>=80?C.teal:C.amber},{l:"Fase",v:`F${proy.faseActual}/9`,c:"var(--t1)"},{l:"Horas",v:pctH+"%",c:pctH>=80?C.red:C.teal},{l:"Cobrado",v:"$"+fi(cobrado),c:C.teal},{l:"Pendiente",v:"$"+fi(pend),c:C.amber}].map((k,i)=>(
                  <div key={i} className="stat-box"><div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:.6,color:"var(--t3)",marginBottom:4}}>{k.l}</div><div className="mono" style={{fontSize:15,fontWeight:800,color:k.c}}>{k.v}</div></div>
                ))}
              </div>
              <PBar pct={proy.avance} color={proy.avance>=80?C.teal:C.amber}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t3)",marginTop:3}}>
                <span>Inicio: {fmtFecha(proy.inicio)}</span><span>Cierre: {fmtFecha(proy.fin)}</span>
              </div>
            </div>
          </div>

          <Tabs tabs={[
            {id:"gantt",lbl:"Cronograma Gantt"},
            {id:"entregables",lbl:"Entregables"},
            {id:"horas",lbl:"Control de Horas"},
            {id:"cobros",lbl:"Cobros"},
            {id:"documentos",lbl:"Documentos"},
          ]} active={tab} onChange={setTab}/>

          {/* GANTT - 9 fases */}
          {tab==="gantt"&&(
            <div className="card">
              <div className="card-hd"><div><div className="ct">Cronograma — {proy.cliente}</div><div className="cs">{proy.plazo} semanas · 9 fases · barra = hoy</div></div></div>
              <div className="cb" style={{paddingTop:0,overflowX:"auto"}}>
                <div style={{display:"grid",gridTemplateColumns:`160px repeat(${N_SEM},1fr)`,background:"var(--bg)",borderBottom:"2px solid var(--bd)"}}>
                  <div style={{padding:"7px 12px",fontSize:11,fontWeight:600,color:"var(--t3)"}}>Fase</div>
                  {Array.from({length:N_SEM},(_,i)=>(
                    <div key={i} style={{padding:"7px 4px",fontSize:10,fontWeight:600,textAlign:"center",borderLeft:"1px solid var(--bd)",color:Math.ceil(HOY_SEM)===i+1?"var(--t1)":"var(--t3)",background:Math.ceil(HOY_SEM)===i+1?"rgba(226,75,74,.04)":"transparent"}}>
                      S{i+1}{Math.ceil(HOY_SEM)===i+1&&<div style={{fontSize:8,color:C.red,fontWeight:700}}>HOY</div>}
                    </div>
                  ))}
                </div>
                {proy.fases.map((f,fi)=>{
                  const ef=EF[f.estado]||EF.pendiente;
                  const col=FASE_COLORS[fi%FASE_COLORS.length];
                  return(
                    <div key={f.id} style={{display:"grid",gridTemplateColumns:`160px repeat(${N_SEM},1fr)`,borderBottom:"1px solid var(--bd)"}}>
                      <div style={{padding:"5px 12px",display:"flex",alignItems:"center",gap:6,borderRight:"1px solid var(--bd)"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:ef.dot,flexShrink:0}}/>
                        <div><div style={{fontSize:10,fontWeight:700,color:"var(--t1)"}}>F{f.id}</div><div style={{fontSize:8,color:"var(--t3)",lineHeight:1.2}}>{(f.nombre||f.nom||"").substring(0,28)}{(f.nombre||f.nom||"").length>28?"…":""}</div></div>
                      </div>
                      {Array.from({length:N_SEM},(_,i)=>{
                        const sem=i+1;
                        const inR=sem>=f.semIni&&sem<=f.semFin;
                        const isF=sem===f.semIni,isL=sem===f.semFin;
                        return(
                          <div key={i} style={{borderLeft:"1px solid var(--bd)",position:"relative",height:34,background:Math.ceil(HOY_SEM)===sem?"rgba(226,75,74,.03)":"transparent"}}>
                            {inR&&<div style={{position:"absolute",left:isF?4:0,right:isL?4:0,height:18,top:8,background:col,opacity:f.estado==="pendiente"?0.25:f.estado==="completada"?1:0.75,borderRadius:isF&&isL?4:isF?"4px 0 0 4px":isL?"0 4px 4px 0":0,display:"flex",alignItems:"center",overflow:"hidden"}}>
                              {isF&&f.avance>0&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:f.avance+"%",background:"rgba(255,255,255,.25)"}}/>}
                              {isF&&f.avance>0&&<span style={{fontSize:8,fontWeight:700,color:"#fff",position:"relative",zIndex:1,paddingLeft:4}}>{f.avance}%</span>}
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div style={{padding:"8px 16px",borderTop:"1px solid var(--bd)",display:"flex",flexWrap:"wrap",gap:8}}>
                  {proy.fases.map((f,fi)=>(
                    <div key={f.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:"var(--t2)"}}>
                      <div style={{width:8,height:5,borderRadius:2,background:FASE_COLORS[fi%FASE_COLORS.length],opacity:f.estado==="pendiente"?0.3:1}}/>F{f.id}: {(f.nombre||f.nom||"").substring(0,22)}{(f.nombre||f.nom||"").length>22?"…":""}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ENTREGABLES */}
          {tab==="entregables"&&(
            <div>
              {(()=>{
                const all=proy.fases.flatMap(f=>f.ents);
                const done=all.filter(e=>e.est==="entregado").length;
                return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{done} / {all.length} entregables completados</div><div style={{width:200}}><PBar pct={all.length>0?pct(done,all.length):0} color={C.teal}/></div></div>;
              })()}
              {proy.fases.map(f=>{
                const ef=EF[f.estado]||EF.pendiente;
                return(
                  <div key={f.id} style={{marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",background:"var(--bg)",borderRadius:"var(--r) var(--r) 0 0",border:"1px solid var(--bd)",borderBottom:"none"}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:ef.dot}}/>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>Fase {f.id} — {f.nombre}</span>
                      <span className={`pill ${ef.pill}`} style={{marginLeft:"auto"}}>{ef.lbl}</span>
                      <span style={{fontSize:11,color:"var(--t3)"}}>{f.avance}%</span>
                    </div>
                    <div className="card" style={{borderRadius:"0 0 var(--r) var(--r)",borderTop:"none"}}>
                      {f.ents.length===0
                      ? <div style={{padding:"12px 16px",fontSize:11,color:"var(--t3)",fontStyle:"italic"}}>Sin entregables registrados para esta fase.</div>
                      : f.ents.map(ent=>{
                        const done=ent.est==="entregado";
                        const dColor={entregado:C.teal,en_curso:C.amber,pendiente:"var(--t3)"}[ent.est];
                        const dias=Math.ceil((new Date(ent.fecha)-new Date("2026-04-02"))/(1000*60*60*24));
                        return(
                          <div key={ent.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 16px",borderBottom:"1px solid var(--bd)"}}>
                            <div onClick={()=>canEdit&&toggleEnt(f.id,ent.id)} style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${done?C.teal:"var(--bd)"}`,background:done?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:canEdit?"pointer":"default",marginTop:2,transition:"all .2s"}}>
                              {done&&<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,fontWeight:600,color:done?"var(--t3)":"var(--t1)",textDecoration:done?"line-through":"none",marginBottom:3}}>{ent.nom}</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:10,color:dColor,fontWeight:600}}>● {ent.est}</span>
                                <span style={{fontSize:10,color:dias<0?C.red:dias<=3?C.amber:"var(--t3)"}}>
                                  {fmtFecha(ent.fecha)}
                                  {!done&&dias<0&&<strong style={{color:C.red}}> ({Math.abs(dias)}d vencido)</strong>}
                                  {!done&&dias>=0&&dias<=3&&<strong style={{color:C.amber}}> ({dias}d)</strong>}
                                </span>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:5,flexShrink:0}}>
                              {ent.arch&&<span style={{fontSize:10,color:C.teal,background:"rgba(29,158,117,.1)",padding:"2px 7px",borderRadius:3}}>✓ Subido</span>}
                              {done&&<button className="btn btn-s btn-xs" onClick={()=>descargarPDF("Evidencia_"+ent.nom.replace(/\s/g,"_"),["Entregable: "+ent.nom,"Proyecto: "+proy.cliente,"Fecha: "+fmtFecha(ent.fecha),"Estado: ENTREGADO"].join("\n"))}>{I.dl}</button>}
                              {!done&&canEdit&&<button className="btn btn-s btn-xs" onClick={()=>setModalDoc(proy.documentos?.find(d=>d.nom===ent.nom)?.id||null)}>{I.upload} Subir</button>}
                            </div>
                          </div>
                        );
                      })}}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* HORAS */}
          {tab==="horas"&&(
            <div className="card">
              <div className="card-hd"><div><div className="ct">Control de Horas</div><div className="cs">Edita y guarda — se persiste automáticamente</div></div>
                <button className="btn btn-s btn-sm" onClick={()=>{
  const tabH='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Cargo</th><th style="padding:7px 10px;text-align:right">H.Cotizadas</th><th style="padding:7px 10px;text-align:right">H.Reales</th><th style="padding:7px 10px;text-align:right">Variación</th><th style="padding:7px 10px;text-align:right">% Uso</th></tr>'+
    (proy.personal||[]).map((p,i)=>{const uso=Math.round((p.real||0)/Math.max(p.cot||1,1)*100);const col=uso>95?'#E24B4A':uso>80?'#BA7517':'#1D9E75';return'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600">'+p.cargo+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace">'+(p.cot||0)+'h</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">'+(p.real||0)+'h</td><td style="padding:6px 10px;text-align:right;font-family:monospace;color:'+(p.real>p.cot?'#E24B4A':'#1D9E75')+'">'+(p.real-p.cot>0?'+':''+(p.real||0)-(p.cot||0))+'h</td><td style="padding:6px 10px;text-align:right;font-weight:700;color:'+col+'">'+uso+'%</td></tr>';}).join('')+'</table>';
  const totalCot=(proy.personal||[]).reduce((a,p)=>a+(p.cot||0),0);
  const totalReal=(proy.personal||[]).reduce((a,p)=>a+(p.real||0),0);
  const pctUso=Math.round(totalReal/Math.max(totalCot,1)*100);
  const colUso=pctUso>95?'#E24B4A':pctUso>80?'#BA7517':'#1D9E75';
  // Barra comparativa SVG
  const barSvg='<svg xmlns="http://www.w3.org/2000/svg" width="460" height="100"><rect width="460" height="100" fill="#f8fafc" rx="6"/>'+
    (proy.personal||[]).slice(0,6).map((p,i)=>{const x=20+i*72;const maxH=Math.max(totalCot,totalReal,1);const hC=Math.max((p.cot||0)/maxH*70,2);const hR=Math.max((p.real||0)/maxH*70,2);const col=((p.real||0)>(p.cot||0))?'#E24B4A':'#1D9E75';return'<rect x="'+x+'" y="'+(80-hC)+'" width="28" height="'+hC+'" fill="#4a9fd4" rx="2" opacity=".6"/><rect x="'+(x+30)+'" y="'+(80-hR)+'" width="28" height="'+hR+'" fill="'+col+'" rx="2" opacity=".9"/><text x="'+(x+14)+'" y="88" fill="#94a3b8" font-size="7" text-anchor="middle">'+p.cargo.split(' ')[0].substring(0,8)+'</text>';}).join('')+
    '<rect x="340" y="12" width="12" height="8" fill="#4a9fd4" rx="1"/><text x="356" y="20" fill="#64748b" font-size="9">Cotizadas</text><rect x="340" y="26" width="12" height="8" fill="#1D9E75" rx="1"/><text x="356" y="34" fill="#64748b" font-size="9">Reales</text></svg>';
  generarPDFRico({
    nombre:"Control_Horas_"+proy.id,
    titulo:"Control de Horas",
    subtitulo:proy.cliente+" · "+proy.proyecto+" · "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}),
    kpis:[
      {label:"Horas cotizadas",value:totalCot+"h",color:"#4a9fd4"},
      {label:"Horas reales",   value:totalReal+"h",color:colUso},
      {label:"% Ejecución",    value:pctUso+"%",  color:colUso},
      {label:"Variación",      value:(totalReal-totalCot>0?"+":"")+(totalReal-totalCot)+"h",color:totalReal>totalCot?'#E24B4A':'#1D9E75'},
    ],
    secciones:[
      {titulo:"Horas Cotizadas vs Reales por Cargo",contenido:barSvg},
      {titulo:"Detalle de Horas por Cargo",         contenido:tabH},
    ],
    analisis:{
      situacion:"Proyecto <strong>"+proy.cliente+"</strong>. Horas cotizadas: <strong>"+totalCot+"h</strong>. Horas reales: <strong>"+totalReal+"h</strong>. Ejecución: <strong>"+pctUso+"%</strong>.",
      riesgos:pctUso>95?"<strong>Alerta crítica:</strong> horas reales superan el 95% de lo cotizado. Riesgo de desvío presupuestal.":pctUso>80?"Horas al "+pctUso+"% del tope cotizado — monitorear semana a semana.":undefined,
      recomendaciones:"<strong>1.</strong> Revisar semanalmente el avance de horas.<br/><strong>2.</strong> Si supera el 90%, coordinar ajuste con el cliente.<br/><strong>3.</strong> Usar datos reales para mejorar futuras cotizaciones.",
    }
  });
}}>{I.dl} Excel</button>
              </div>
              <table>
                <thead><tr><th>Cargo</th><th>Cotizadas</th><th>Reales</th><th>Variación</th><th>% ejec.</th></tr></thead>
                <tbody>
                  {(personalEj.length>0?personalEj:proy.personal||[]).map((p,i)=>{
                    const perc=Math.min(pct(p.real,p.cot),100);
                    const vari=p.real-p.cot;
                    const color=perc>=95?C.red:perc>=80?C.amber:C.teal;
                    return(
                      <tr key={i}>
                        <td style={{fontWeight:600}}>{p.cargo}</td>
                        <td className="mono">{fi(p.cot)}h</td>
                        <td>{canEdit?<input type="number" defaultValue={p.real} min={0} onBlur={e=>guardarHoras(p.cargo,e.target.value)} style={{width:80,padding:"3px 8px",fontSize:12,textAlign:"center"}}/>:<span className="mono">{fi(p.real)}h</span>}</td>
                        <td className="mono" style={{fontWeight:700,color:vari>0?C.red:C.teal}}>{vari>0?"+":""}{vari}h</td>
                        <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1}}><PBar pct={perc} color={color}/></div><span className="mono" style={{fontSize:11,color,fontWeight:700,minWidth:32}}>{perc}%</span></div>{perc>=80&&<div style={{fontSize:9,color,marginTop:2}}>{perc>=95?"⚠ Crítico":"! Alerta"}</div>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {canEdit&&<div style={{padding:"10px 16px",fontSize:11,color:"var(--t3)",borderTop:"1px solid var(--bd)"}}>{I.save} Los cambios se guardan al salir de cada campo (onBlur)</div>}
            </div>
          )}

          {/* COBROS */}
          {tab==="cobros"&&(
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Cronograma de Cobros</div><div className="cs">{"$"+fi(proy.valor)} · {proy.cobros.length} cuotas</div></div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:11,color:C.teal,fontWeight:600}}>Cobrado: {"$"+fi(cobrado)}</span>
                  <span style={{fontSize:11,color:C.amber,fontWeight:600}}>Pendiente: {"$"+fi(pend)}</span>
                  <button className="btn btn-s btn-sm" onClick={()=>{
  const tabC='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">Cuota</th><th style="padding:7px 10px;text-align:right">Monto USD</th><th style="padding:7px 10px;text-align:right">Monto PEN</th><th style="padding:7px 10px">Fecha</th><th style="padding:7px 10px">Estado</th></tr>'+
    (proy.cobros||[]).map((c,i)=>{const col=c.estado==="cobrado"||c.estado==="pagado"?'#1D9E75':new Date(c.fecha)<new Date()?'#E24B4A':'#BA7517';return'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:700">Cuota '+c.n+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700">$'+fi(c.monto)+'</td><td style="padding:6px 10px;text-align:right;font-family:monospace;color:#64748b">S/ '+fi(Math.round(c.monto*3.6))+'</td><td style="padding:6px 10px;color:#475569">'+fmtFecha(c.fecha)+'</td><td style="padding:6px 10px"><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:'+col+'22;color:'+col+'">'+c.estado.toUpperCase()+'</span></td></tr>';}).join('')+
    '<tr style="background:#f0fdf9;font-weight:800"><td style="padding:8px 10px">TOTALES</td><td style="padding:8px 10px;text-align:right;font-family:monospace;color:#1D9E75">$'+fi(proy.valor)+'</td><td style="padding:8px 10px;text-align:right;font-family:monospace;color:#64748b">S/ '+fi(Math.round(proy.valor*3.6))+'</td><td colspan="2" style="padding:8px 10px;color:#64748b">'+proy.cuotas+' cuotas</td></tr></table>';
  const pctCob=Math.round(cobrado/Math.max(proy.valor,1)*100);
  const colCob=pctCob>=75?'#1D9E75':pctCob>=40?'#BA7517':'#E24B4A';
  // Dona de cobranza
  const r=44,cx=55,cy=55,circ=2*Math.PI*r;
  const donut='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="130"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#e2e8f0" stroke-width="16"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+colCob+'" stroke-width="16" stroke-dasharray="'+(circ*pctCob/100)+' '+(circ*(1-pctCob/100))+'" stroke-dashoffset="'+(circ/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1a2e4a" font-size="15" font-weight="900" text-anchor="middle">'+pctCob+'%</text><text x="'+cx+'" y="'+(cy+17)+'" fill="#64748b" font-size="8" text-anchor="middle">cobrado</text>'+'<text x="140" y="30" fill="#1D9E75" font-size="10" font-weight="700">Cobrado</text><text x="140" y="44" fill="#1D9E75" font-size="13" font-weight="900" font-family="monospace">$'+fi(cobrado)+'</text><text x="140" y="66" fill="#BA7517" font-size="10" font-weight="700">Pendiente</text><text x="140" y="80" fill="#BA7517" font-size="13" font-weight="900" font-family="monospace">$'+fi(pend)+'</text></svg>';
  generarPDFRico({
    nombre:"Cobros_"+proy.id,
    titulo:"Cronograma de Cobros",
    subtitulo:proy.cliente+" · "+proy.proyecto+" · "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}),
    kpis:[
      {label:"Total contrato",  value:"$"+fi(proy.valor),  color:"#1a2e4a"},
      {label:"Cobrado",         value:"$"+fi(cobrado),      color:"#1D9E75"},
      {label:"Pendiente",       value:"$"+fi(pend),         color:"#BA7517"},
      {label:"% Cobranza",      value:pctCob+"%",           color:colCob},
    ],
    secciones:[
      {titulo:"Estado de Cobranza",        contenido:donut},
      {titulo:"Detalle de Cuotas",         contenido:tabC},
    ],
    analisis:{
      situacion:"Proyecto <strong>"+proy.cliente+"</strong>. Contrato: <strong>USD "+fi(proy.valor)+"</strong>. Cobrado: <strong>USD "+fi(cobrado)+"</strong> ("+pctCob+"%). Pendiente: <strong>USD "+fi(pend)+"</strong>.",
      riesgos:(proy.cobros||[]).filter(c=>c.estado!=="cobrado"&&c.estado!=="pagado"&&new Date(c.fecha)<new Date()).length>0?"Existen cuotas vencidas sin cobrar. Gestionar inmediatamente.":undefined,
      recomendaciones:"<strong>1.</strong> Emitir factura al completar cada fase.<br/><strong>2.</strong> Hacer seguimiento de cuotas 5 días antes del vencimiento.<br/><strong>3.</strong> Registrar el cobro en el sistema al recibir el pago.",
    }
  });
}}>{I.dl} PDF</button>
                </div>
              </div>
              {proy.cobros.map(c=>{
                const esCobrado=c.estado==="cobrado";
                const dias=Math.ceil((new Date(c.fecha)-new Date("2026-04-02"))/(1000*60*60*24));
                return(
                  <div key={c.n} style={{display:"flex",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid var(--bd)",gap:14}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:esCobrado?"rgba(29,158,117,.15)":"rgba(186,117,23,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:14,fontWeight:800,color:esCobrado?C.teal:C.amber}}>{c.n}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:2}}>Cuota {c.n} — {"$"+fi(c.monto)}</div>
                      <div style={{fontSize:11,color:dias<0&&!esCobrado?C.red:"var(--t3)"}}>{fmtFecha(c.fecha)}{!esCobrado&&dias<0&&<strong style={{color:C.red}}> — Vencida hace {Math.abs(dias)}d</strong>}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <span className={`pill ${esCobrado?"teal":dias<0?"red":"amber"}`}>{esCobrado?"✓ Cobrado":dias<0?"Vencida":"⏳ Pendiente"}</span>
                      {!esCobrado&&["Admin","Gerencia","Finanzas"].includes(usuario.rol)&&<div style={{marginTop:6}}><button className="btn btn-g btn-xs" onClick={()=>marcarCobro(c.n)}>{I.check} Marcar cobrado</button></div>}
                    </div>
                  </div>
                );
              })}
              <div style={{padding:"14px 16px",borderTop:"1px solid var(--bd)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:"var(--t3)"}}>% cobrado</span><span className="mono" style={{fontSize:12,fontWeight:700,color:C.teal}}>{pct(cobrado,proy.valor)}%</span></div>
                <PBar pct={pct(cobrado,proy.valor)} color={C.teal}/>
              </div>
            </div>
          )}

          {/* DOCUMENTOS - NUEVO TAB */}
          {tab==="documentos"&&(
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Repositorio de Documentos</div><div className="cs">{(proy.documentos||[]).filter(d=>d.subido).length} de {(proy.documentos||[]).length} documentos cargados</div></div>
                {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalNuevoDoc(true)}>{I.plus} Agregar</button>}
              </div>
              <table>
                <thead><tr><th>Documento</th><th>Tipo</th><th>Fecha</th><th>Tamaño</th><th>Estado</th><th style={{textAlign:"center"}}>Acciones</th></tr></thead>
                <tbody>
                  {(proy.documentos||[]).map(doc=>(
                    <tr key={doc.id}>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:28,height:28,borderRadius:4,background:doc.subido?"rgba(29,158,117,.12)":"rgba(186,117,23,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            {I.file}
                          </div>
                          <div>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{doc.nom}</div>
                          </div>
                        </div>
                      </td>
                      <td><span style={{fontSize:10,textTransform:"capitalize",background:"var(--hv)",padding:"2px 7px",borderRadius:3,color:"var(--t2)"}}>{doc.tipo}</span></td>
                      <td style={{fontSize:11,color:"var(--t3)"}}>{fmtFecha(doc.fecha)}</td>
                      <td className="mono" style={{fontSize:11,color:"var(--t3)"}}>{doc.size||"—"}</td>
                      <td><span className={`pill ${doc.subido?"teal":"amber"}`}>{doc.subido?"✓ Subido":"Pendiente"}</span></td>
                      <td>
                        <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                          {doc.subido ? (
                            <button className="btn btn-g btn-xs" onClick={()=>{const txt=["Aquarius Consulting S.A.C.","","Documento: "+doc.nom,"Proyecto: "+proy.cliente+" — "+proy.id,"Tipo: "+doc.tipo,"Fecha: "+fmtFecha(doc.fecha),"Tamaño: "+doc.size,"","Documento generado desde Aquarius CRM Pro"].join("\n");descargarPDF(doc.nom.replace(/\s/g,"_"),txt);toast("✓ Documento descargado","success");}}>{I.dl} Descargar</button>
                          ) : (
                            canEdit&&<button className="btn btn-p btn-xs" onClick={()=>setModalDoc(doc.id)}>{I.upload} Cargar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(proy.documentos||[]).length===0&&(
                <div style={{padding:"32px",textAlign:"center",color:"var(--t3)"}}>
                  <div style={{fontSize:28,marginBottom:8}}>📂</div>
                  <div>No hay documentos registrados para este proyecto.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ModalNuevaSolicitudForm({proyectos, proyectoIdFijo, onSave, onClose, toast}) {
  const [form, setForm] = React.useState({
    tipo: "personal",
    descripcion: "",
    cantidad: 1,
    fechaNecesidad: "",
    prioridad: "normal",
    notas: "",
    proyId: proyectoIdFijo || (proyectos[0]?.id || ""),
  });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const guardar = () => {
    if(!form.descripcion.trim()) { toast("Ingresa una descripción","error"); return; }
    onSave(form);
    onClose();
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"var(--card)",borderRadius:12,padding:28,width:480,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:800,color:"var(--t1)"}}>Nueva Solicitud de Recursos</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"var(--t3)"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {!proyectoIdFijo && (
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Proyecto</label>
              <select value={form.proyId} onChange={e=>upd("proyId",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.cliente} — {p.id}</option>)}
              </select>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Tipo *</label>
              <select value={form.tipo} onChange={e=>upd("tipo",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}>
                {["personal","epp","equipos","viaticos","otros"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Prioridad</label>
              <select value={form.prioridad} onChange={e=>upd("prioridad",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}>
                {["baja","normal","alta","urgente"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Descripción *</label>
            <input value={form.descripcion} onChange={e=>upd("descripcion",e.target.value)} placeholder="Ej: 2 consultores para inventario físico..." style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Cantidad</label>
              <input type="number" min="1" value={form.cantidad} onChange={e=>upd("cantidad",parseInt(e.target.value)||1)} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Fecha necesidad</label>
              <input type="date" value={form.fechaNecesidad} onChange={e=>upd("fechaNecesidad",e.target.value)} style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12}}/>
            </div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Notas adicionales</label>
            <textarea value={form.notas} onChange={e=>upd("notas",e.target.value)} rows={3} placeholder="Detalles adicionales..." style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid var(--bd)",fontSize:12,resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
            <button onClick={onClose} className="btn btn-s">Cancelar</button>
            <button onClick={guardar} className="btn btn-p">✓ Crear solicitud</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlCalidad({toast,usuario,proyectos,inventariosDatos}) {
  const [checklists,setChecklists]   = useState(CC_INIT);
  const [selId,setSelId]             = useState("CC-001");
  const [tab,setTab]                 = useState("activos");
  const [busqActivo,setBusqActivo]   = useState("");
  const [selProyId,setSelProyId]     = useState(proyectos[0]?.id||"");
  const [filtEstado,setFiltEstado]   = useState("todos");

  const canEdit = ["Admin","Jefe Proyecto","Consultor","Operaciones"].includes(usuario.rol);
  const cc = checklists.find(x=>x.id===selId)||checklists[0];

  const ESTADOS = {
    conforme:  {lbl:"Conforme",   pill:"teal",  dot:C.teal},
    faltante:  {lbl:"Faltante",   pill:"red",   dot:C.red},
    sobrante:  {lbl:"Sobrante",   pill:"blue",  dot:C.blue},
    deteriorado:{lbl:"Deteriorado",pill:"amber", dot:C.amber},
  };
  const CC_ESTADO = {
    en_curso:  {lbl:"En curso",   pill:"amber"},
    completado:{lbl:"Completado", pill:"teal"},
    pendiente: {lbl:"Pendiente",  pill:"navy"},
  };

  const activosFiltrados = (cc?.activos||[]).filter(a=>{
    const mB = !busqActivo||a.descripcion.toLowerCase().includes(busqActivo.toLowerCase())||a.codigo.toLowerCase().includes(busqActivo.toLowerCase());
    const mE = filtEstado==="todos"||a.estado===filtEstado;
    return mB&&mE;
  });

  const resumen = (activos) => ({
    total:      activos.length,
    conforme:   activos.filter(a=>a.estado==="conforme").length,
    faltante:   activos.filter(a=>a.estado==="faltante").length,
    sobrante:   activos.filter(a=>a.estado==="sobrante").length,
    deteriorado:activos.filter(a=>a.estado==="deteriorado").length,
  });

  const cambiarEstado = (activoId, nuevoEstado) => {
    setChecklists(prev=>prev.map(c=>{
      if(c.id!==cc.id)return c;
      const nuevosActivos = c.activos.map(a=>a.id===activoId?{...a,estado:nuevoEstado}:a);
      const conf = nuevosActivos.filter(a=>a.estado==="conforme").length;
      const avance = Math.round((conf/nuevosActivos.length)*100);
      return{...c,activos:nuevosActivos,avance};
    }));
    toast("✓ Estado actualizado","success");
  };

  const actualizarObs = (activoId, obs) => {
    setChecklists(prev=>prev.map(c=>{
      if(c.id!==cc.id)return c;
      return{...c,activos:c.activos.map(a=>a.id===activoId?{...a,obs}:a)};
    }));
  };

  const exportarReporte = () => {
    if(!cc) return;
    const res = resumen(cc.activos);
    const pctConf = res.total>0 ? Math.round(res.conforme/res.total*100) : 0;
    const r2=50,cx=65,cy=65,circ=2*Math.PI*r2;
    const dash=circ*(pctConf/100);
    let donut='<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130">';
    donut+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="14"/>';
    donut+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(pctConf>=90?"#1D9E75":pctConf>=70?"#BA7517":"#E24B4A")+'" stroke-width="14" stroke-dasharray="'+dash+' '+(circ-dash)+'" stroke-dashoffset="'+(circ/4)+'" stroke-linecap="round"/>';
    donut+='<text x="'+cx+'" y="'+(cy+6)+'" fill="#1E293B" font-size="18" font-weight="800" text-anchor="middle">'+pctConf+'%</text>';
    donut+='<text x="'+cx+'" y="'+(cy+20)+'" fill="#64748b" font-size="9" text-anchor="middle">conformidad</text>';
    donut+='</svg>';
    const estados=[["Conformes",res.conforme,"#1D9E75"],["Faltantes",res.faltante,"#E24B4A"],["Sobrantes",res.sobrante,"#4a9fd4"],["Deteriorados",res.deteriorado,"#BA7517"]];
    let barChart='<svg xmlns="http://www.w3.org/2000/svg" width="280" height="'+(estados.length*34+20)+'" style="font-family:Segoe UI,sans-serif"><rect width="280" height="'+(estados.length*34+20)+'" fill="#f8fafc" rx="6"/>';
    estados.forEach(([lbl,val,col],i)=>{
      const y=10+i*34; const bw=Math.max((val/Math.max(res.total,1))*200,val>0?4:0);
      barChart+='<text x="8" y="'+(y+12)+'" fill="#1E293B" font-size="10" font-weight="600">'+lbl+'</text>';
      barChart+='<rect x="8" y="'+(y+14)+'" width="200" height="12" fill="#e2e8f0" rx="4"/>';
      if(val>0) barChart+='<rect x="8" y="'+(y+14)+'" width="'+bw+'" height="12" fill="'+col+'" rx="4"/>';
      barChart+='<text x="214" y="'+(y+24)+'" fill="'+col+'" font-size="11" font-weight="700">'+val+' ('+Math.round(val/Math.max(res.total,1)*100)+'%)</text>';
    });
    barChart+='</svg>';
    const tablaA='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">Código</th><th style="padding:7px">Descripción</th><th style="padding:7px">Tipo</th><th style="padding:7px;text-align:center">Estado</th><th style="padding:7px">Observación</th></tr>'
      +cc.activos.map((a,i)=>{const col=({conforme:"#1D9E75",faltante:"#E24B4A",sobrante:"#4a9fd4",deteriorado:"#BA7517"})[a.estado]||"#94a3b8";return'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:5px 10px;font-family:monospace;font-size:10px;color:#4a9fd4;font-weight:700">'+a.codigo+'</td><td style="padding:5px 10px">'+a.descripcion+'</td><td style="padding:5px 10px;font-size:10px;color:#64748b">'+a.tipo+'</td><td style="padding:5px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">'+a.estado.toUpperCase()+'</span></td><td style="padding:5px 10px;font-size:10px;color:#E24B4A">'+(a.obs||"—")+'</td></tr>';}).join('')+'</table>';
    generarPDFRico({
      nombre:"CC_"+cc.proy+"_"+cc.cliente.replace(/\s/g,"_"),
      titulo:"Reporte Control de Calidad — Inventario Físico",
      subtitulo:cc.proy+" · "+cc.cliente+" · "+cc.ubicacion,
      kpis:[{label:"Total inventariados",value:res.total,color:"#1E293B"},{label:"Conformes",value:res.conforme+" ("+pctConf+"%)",color:"#1D9E75"},{label:"Faltantes",value:res.faltante,color:"#E24B4A"},{label:"Sobrantes",value:res.sobrante,color:"#4a9fd4"},{label:"Deteriorados",value:res.deteriorado,color:"#BA7517"},{label:"Avance",value:cc.avance+"%",color:cc.avance>=80?"#1D9E75":"#BA7517"},{label:"Responsable",value:cc.responsable,color:"#1E293B"},{label:"Estado",value:cc.estado.toUpperCase(),color:"#4a9fd4"}],
      secciones:[
        {titulo:"Análisis Visual de Conformidad",contenido:'<div style="display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center">'+donut+barChart+'</div>'},
        {titulo:"Detalle Completo de Activos Inventariados",contenido:tablaA},
      ],
      analisis:{
        situacion:"El inventario físico del proyecto <strong>"+cc.proy+" — "+cc.cliente+"</strong> en <strong>"+cc.ubicacion+"</strong> registra <strong>"+res.total+" activos</strong> con un avance del <strong>"+cc.avance+"%</strong>. Tasa de conformidad: <strong>"+pctConf+"%</strong>. Responsable: "+cc.responsable+".",
        logros:pctConf>=80?"Tasa de conformidad del "+pctConf+"% — nivel "+(pctConf>=90?"excelente":"aceptable")+". El proceso de inventario avanza según lo planificado.":undefined,
        riesgos:(res.faltante>0?"<strong>"+res.faltante+" activo(s) faltante(s)</strong>: no localizados en zona asignada. Requieren investigación inmediata. ":"")+(res.sobrante>0?"<strong>"+res.sobrante+" activo(s) sobrante(s)</strong>: no figuran en base contable — tramitar alta. ":"")+(res.deteriorado>0?"<strong>"+res.deteriorado+" activo(s) deteriorado(s)</strong>: evaluar mantenimiento o baja.":""),
        recomendaciones:"<strong>1.</strong> Investigar los "+res.faltante+" activos faltantes con el área responsable.<br/><strong>2.</strong> Gestionar el alta contable de "+res.sobrante+" activos sobrantes.<br/><strong>3.</strong> Emitir orden de mantenimiento para "+res.deteriorado+" activos deteriorados.<br/><strong>4.</strong> Validar hallazgos con el cliente antes de cerrar la fase.<br/><strong>5.</strong> Documentar evidencia fotográfica de activos no conformes."
      }
    });
    toast("✓ Reporte CC con gráficas generado","success");
  };

  const res = cc ? resumen(cc.activos) : {total:0,conforme:0,faltante:0,sobrante:0,deteriorado:0};

  return(
    <div>
      {/* MODAL NUEVO ACTIVO */}
      

      {/* Banner inventarios cargados desde módulo Inventario */}
      {/* -- INV-6: Panel inventario por proyecto -- */}
      {(()=>{
        const proyCC = proyectos.find(p=>p.id===selProyId)||proyectos[0];
        const invsProy = proyCC?.inventarios||[];
        const totalInv = invsProy.reduce((a,i)=>a+(i.totalUnicos||i.total||0),0);
        const presup   = proyCC?.activosPresupuestados||0;
        const pct      = presup>0?Math.round(totalInv/presup*100):null;
        return (
          <div style={{marginBottom:14,padding:"14px 16px",background:"var(--card)",
            border:"1px solid var(--bd)",borderRadius:"var(--r)"}}>
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,color:"var(--t2)",flexShrink:0}}>Proyecto:</span>
              <select value={selProyId} onChange={e=>setSelProyId(e.target.value)}
                style={{flex:1,maxWidth:380,fontWeight:600,fontSize:12}}>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.cliente} — {p.id}</option>)}
              </select>
            </div>
            {invsProy.length>0?(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
                  {[
                    {l:"Activos inventariados", v:(totalInv).toLocaleString("es-PE"),   c:"#0D9488"},
                    {l:"Presupuestados",         v:presup>0?presup.toLocaleString("es-PE"):"—", c:"#1E293B"},
                    {l:"Avance inventario",       v:pct!=null?pct+"%":"—",               c:pct>100?"#DC2626":pct>=80?"#0D9488":"#D97706"},
                    {l:"Archivos cargados",       v:invsProy.length,                     c:"#4a9fd4"},
                  ].map((k,i)=>(
                    <div key={i} style={{textAlign:"center",padding:"8px",background:"var(--hv)",borderRadius:8}}>
                      <div style={{fontSize:18,fontWeight:800,color:k.c,fontFamily:"var(--mono)"}}>{k.v}</div>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{k.l}</div>
                    </div>
                  ))}
                </div>

                {/* DASHBOARD CC — 6 gráficos del inventario real */}
                {(()=>{
                  // Datos reales del inventario cargado (datosCompletos + mapeo)
                  const inv0 = invsProy[0];
                  const mapa = inv0?.mapeo || null;
                  const filas = invsProy.flatMap(inv=>inv.datosCompletos||inv.activos||[]);
                  if(filas.length===0) return null;

                  const N = filas.length;
                  const COLS = ["#4a9fd4","#1D9E75","#BA7517","#E24B4A","#7c3aed","#0891b2","#1a2e4a","#f59e0b"];

                  // Helper: contar por campo del mapeo o campo directo
                  const contarPor = (campo) => {
                    const counts = {};
                    filas.forEach(r=>{
                      const val = mapa && mapa[campo] ? (r[mapa[campo]]||"Sin dato").toString().trim().substring(0,35)||"Sin dato"
                                : (r[campo]||r.tipo||"Sin dato").toString().trim().substring(0,35)||"Sin dato";
                      counts[val]=(counts[val]||0)+1;
                    });
                    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
                  };

                  // Los 6 datasets
                  const dFamilia    = contarPor("catalogo");
                  const dUbicacion  = contarPor("ubicacion");
                  const dConserv    = contarPor("estCon");
                  const dCCosto     = contarPor("ccosto");
                  const dResponsable= contarPor("responsable");
                  const dPlaca      = (()=>{
                    const conPlaca = filas.filter(r=>{
                      const v = mapa?.barcode ? r[mapa.barcode] : r.codigo||r.barcode||"";
                      return v && v.toString().trim()!=="";
                    }).length;
                    return [{name:"Con placa/etiqueta",value:conPlaca},{name:"Sin placa/etiqueta",value:N-conPlaca}];
                  })();

                  // Componente mini gráfico de barras horizontales
                  const GrafBarra = ({titulo,datos,color="#4a9fd4"}) => {
                    const maxV = Math.max(...datos.map(d=>d[1]||d.value||0),1);
                    const items = datos.slice(0,6);
                    return(
                      <div style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:8,padding:"12px 14px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>{titulo}</div>
                        {items.length===0
                          ? <div style={{fontSize:10,color:"var(--t3)",textAlign:"center",padding:"12px 0"}}>Sin datos del campo</div>
                          : items.map(([nombre,cnt],i)=>(
                          <div key={i} style={{marginBottom:6}}>
                            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}>
                              <span style={{color:"var(--t2)",fontWeight:500,maxWidth:"70%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nombre||"Sin dato"}</span>
                              <span style={{fontWeight:700,color:C.navy,fontFamily:"var(--mono)"}}>{(cnt||0).toLocaleString("es-PE")}</span>
                            </div>
                            <div style={{height:7,background:"var(--bd)",borderRadius:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:((cnt||0)/maxV*100)+"%",background:color,borderRadius:4,transition:"width .4s ease"}}/>
                            </div>
                          </div>
                        ))}
                        <div style={{fontSize:9,color:"var(--t3)",marginTop:6,textAlign:"right"}}>
                          {items.reduce((a,[,v])=>a+(v||0),0).toLocaleString("es-PE")} / {N.toLocaleString("es-PE")} activos
                        </div>
                      </div>
                    );
                  };

                  // Componente donut SVG
                  const Donut = ({titulo,datos,cols}) => {
                    const total = datos.reduce((a,d)=>a+(d.value||0),0)||1;
                    let offset = 0;
                    const R=38, CX=50, CY=50, circ=2*Math.PI*R;
                    return(
                      <div style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:8,padding:"12px 14px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>{titulo}</div>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <svg viewBox="0 0 100 100" width={90} height={90} style={{flexShrink:0}}>
                            {datos.map((d,i)=>{
                              const pct=(d.value||0)/total;
                              const dash=circ*pct;
                              const gap=circ-dash;
                              const off=circ*(1-offset)-circ/4;
                              offset+=pct;
                              return(<circle key={i} cx={CX} cy={CY} r={R} fill="none"
                                stroke={cols?cols[i]||COLS[i%COLS.length]:COLS[i%COLS.length]}
                                strokeWidth={18} strokeDasharray={dash+" "+gap}
                                strokeDashoffset={off} strokeLinecap="butt"/>);
                            })}
                            <text x={CX} y={CY+4} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--t1)">{N.toLocaleString("es-PE")}</text>
                            <text x={CX} y={CY+14} textAnchor="middle" fontSize={7} fill="var(--t3)">activos</text>
                          </svg>
                          <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                            {datos.map((d,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:10}}>
                                <div style={{width:8,height:8,borderRadius:2,background:cols?cols[i]||COLS[i%COLS.length]:COLS[i%COLS.length],flexShrink:0}}/>
                                <span style={{color:"var(--t2)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span>
                                <span style={{fontWeight:700,color:C.navy,fontFamily:"var(--mono)"}}>{Math.round((d.value||0)/total*100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  const COLS_CONSERV = ["#16a34a","#0284c7","#d97706","#ea580c","#dc2626","#7c3aed","#94a3b8","#1a2e4a"];

                  return(
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:.5,marginBottom:10,paddingBottom:6,borderBottom:"2px solid "+C.blue}}>
                        📊 Dashboard de inventario — {N.toLocaleString("es-PE")} activos registrados
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                        <GrafBarra titulo="Por familia / tipo de activo" datos={dFamilia} color={C.blue}/>
                        <GrafBarra titulo="Por ubicación / sede" datos={dUbicacion} color={C.teal}/>
                        <Donut titulo="Estado de conservación" datos={dConserv.map(([n,v])=>({name:n,value:v}))} cols={COLS_CONSERV}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                        <GrafBarra titulo="Por centro de costo" datos={dCCosto} color={C.navy}/>
                        <GrafBarra titulo="Por responsable / custodio" datos={dResponsable} color={C.amber}/>
                        <Donut titulo="Placa / etiqueta asignada"
                          datos={dPlaca}
                          cols={[C.teal,C.red]}/>
                      </div>
                      {!mapa&&<div style={{fontSize:10,color:C.amber,marginTop:8,padding:"6px 10px",background:"rgba(186,117,23,.08)",borderRadius:6}}>
                        ⚠ Datos de inventario sin mapeo de columnas — los gráficos muestran campos genéricos. Para mayor detalle, carga el inventario desde <strong>Carga de Inventario</strong>.
                      </div>}
                    </div>
                  );
                })()}

                <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginBottom:6}}>CARGAS REALIZADAS:</div>
                {invsProy.map((inv,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"5px 8px",
                    background:i%2?"var(--hv)":"transparent",borderRadius:6,marginBottom:2}}>
                    <span style={{fontSize:11}}>📄</span>
                    <span style={{flex:1,fontSize:11,color:"var(--t1)",fontWeight:600}}>{inv.archivo}</span>
                    <span style={{fontSize:10,color:"var(--t3)"}}>{inv.fecha}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#0D9488",fontFamily:"var(--mono)"}}>
                      {(inv.totalUnicos||inv.total||0).toLocaleString("es-PE")} activos
                    </span>
                  </div>
                ))}
              </>
            ):(
              <div style={{textAlign:"center",padding:"16px",color:"var(--t3)",fontSize:12}}>
                Sin inventario cargado para este proyecto.
                <span style={{marginLeft:6}}>Ve a <strong>Carga de Inventario</strong> para subir archivos.</span>
              </div>
            )}
          </div>
        );
      })()}

      {(inventariosDatos||[]).length>0&&(
        <div style={{marginBottom:12,padding:"10px 14px",background:"rgba(13,148,136,.06)",
          border:"1px solid rgba(13,148,136,.2)",borderRadius:8,display:"flex",gap:12,
          alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#0F766E"}}>📊 Inventarios cargados:</span>
          {(inventariosDatos||[]).map((inv,i)=>(
            <span key={i} style={{fontSize:11,padding:"2px 10px",borderRadius:10,
              background:"rgba(13,148,136,.1)",color:"#0D9488",fontWeight:600}}>
              {inv.cliente} · {inv.total?.toLocaleString()||"?"} activos · {inv.fecha}
            </span>
          ))}
          <span style={{fontSize:11,color:"var(--t3)",marginLeft:"auto"}}>
            Vincula los activos del inventario con el control de calidad
          </span>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Control de Calidad — Inventario Físico</div><div className="ss">{checklists.length} checklists · {checklists.reduce((a,c)=>a+c.activos.length,0)} activos registrados</div></div>
        <div style={{display:"flex",gap:8}}>
          
          <button className="btn btn-s btn-sm" onClick={exportarReporte}>{I.dl} Exportar reporte</button>
        </div>
      </div>

      {/* KPIs del checklist activo */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Total inventariados", v:res.total,       col:"blue"},
          {l:"Conformes",          v:res.conforme,     col:"teal"},
          {l:"Faltantes",          v:res.faltante,     col:"red"},
          {l:"Sobrantes",          v:res.sobrante,     col:"blue"},
          {l:"Deteriorados",       v:res.deteriorado,  col:"amber"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14,alignItems:"start"}}>
        {/* Lista de checklists */}
        <div className="card">
          <div className="card-hd"><div className="ct">Checklists</div></div>
          {checklists.map(c=>(
            <div key={c.id} onClick={()=>{setSelId(c.id);setBusqActivo("");setFiltEstado("todos");}} style={{padding:"12px 14px",borderBottom:"1px solid var(--bd)",cursor:"pointer",background:selId===c.id?"rgba(74,159,212,.06)":"transparent",borderLeft:selId===c.id?`3px solid ${C.blue}`:"3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{c.id}</span>
                <span className={`pill ${CC_ESTADO[c.estado]?.pill||"navy"}`} style={{fontSize:9}}>{CC_ESTADO[c.estado]?.lbl}</span>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:2}}>{c.cliente}</div>
              <div style={{fontSize:10,color:"var(--t3)",marginBottom:4}}>{c.ubicacion.substring(0,32)}{c.ubicacion.length>32?"…":""}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1}}><PBar pct={c.avance} color={c.avance===100?C.teal:C.amber} height={4}/></div>
                <span className="mono" style={{fontSize:10,color:"var(--t3)"}}>{c.avance}%</span>
              </div>
              <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>{c.activos.length} activos · {c.responsable}</div>
            </div>
          ))}
        </div>

        {/* Detalle del checklist seleccionado */}
        {cc&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Header */}
            <div className="card">
              <div className="card-hd">
                <div>
                  <div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:2}}>{cc.id} · {cc.proy}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>{cc.cliente}</div>
                  <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{cc.ubicacion} · {cc.responsable} · {cc.fecha}</div>
                </div>
                <span className={`pill ${CC_ESTADO[cc.estado]?.pill||"navy"}`}>{CC_ESTADO[cc.estado]?.lbl}</span>
              </div>
              <div className="cb">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:"var(--t3)"}}>Avance del inventario</span>
                  <span className="mono" style={{fontSize:12,fontWeight:700,color:cc.avance===100?C.teal:C.amber}}>{cc.avance}%</span>
                </div>
                <PBar pct={cc.avance} color={cc.avance===100?C.teal:C.amber}/>
                {/* Mini resumen por estado */}
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  {Object.entries(ESTADOS).map(([k,v])=>{
                    const count = cc.activos.filter(a=>a.estado===k).length;
                    return count>0?(
                      <button key={k} onClick={()=>setFiltEstado(filtEstado===k?"todos":k)} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:12,border:`1px solid ${filtEstado===k?v.dot+"60":"var(--bd)"}`,background:filtEstado===k?v.dot+"15":"transparent",cursor:"pointer",transition:"all .15s"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:v.dot,flexShrink:0}}/>
                        <span style={{fontSize:11,fontWeight:600,color:v.dot}}>{count} {v.lbl}</span>
                      </button>
                    ):null;
                  })}
                </div>
              </div>
            </div>

            {/* Tabla de activos */}
            <div className="card">
              <div className="card-hd">
                <div><div className="ct">Activos inventariados</div><div className="cs">{activosFiltrados.length} de {cc.activos.length} mostrados</div></div>
                <input value={busqActivo} onChange={e=>setBusqActivo(e.target.value)} placeholder="Buscar código o descripción…" style={{fontSize:11,padding:"4px 9px",width:200}}/>
              </div>
              <div style={{overflowX:"auto"}}>
                <table>
                  <thead>
                    <tr>
                      <th>Código AF</th>
                      <th>Descripción</th>
                      <th>Tipo</th>
                      <th>N° Serie</th>
                      <th>Estado</th>
                      <th>Observación</th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {activosFiltrados.map(a=>{
                      const est = ESTADOS[a.estado]||ESTADOS.conforme;
                      return(
                        <tr key={a.id} style={{background:a.estado==="faltante"?"rgba(226,75,74,.03)":a.estado==="sobrante"?"rgba(74,159,212,.03)":"transparent"}}>
                          <td><span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{a.codigo}</span></td>
                          <td>
                            <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{a.descripcion}</div>
                            {a.marca&&a.marca!=="—"&&<div style={{fontSize:10,color:"var(--t3)"}}>{a.marca} {a.modelo}</div>}
                          </td>
                          <td style={{fontSize:11,color:"var(--t2)"}}>{a.tipo}</td>
                          <td className="mono" style={{fontSize:10,color:"var(--t3)"}}>{a.serie||"—"}</td>
                          <td>
                            {canEdit
                              ? <select value={a.estado} onChange={e=>cambiarEstado(a.id,e.target.value)}
                                  style={{fontSize:11,padding:"2px 5px",color:est.dot,fontWeight:700,
                                    border:"1px solid "+est.dot+"50",borderRadius:4,
                                    background:"transparent",cursor:"pointer"}}>
                                  {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                                </select>
                              : <div style={{display:"flex",alignItems:"center",gap:5}}>
                                  <div style={{width:7,height:7,borderRadius:"50%",background:est.dot,flexShrink:0}}/>
                                  <span style={{fontSize:11,fontWeight:600,color:est.dot}}>{est.lbl}</span>
                                </div>
                            }
                            {a.foto&&<span title="Foto tomada" style={{fontSize:9,color:C.teal,marginLeft:4}}>📷</span>}
                          </td>
                          <td>
                            {canEdit
                              ? <input defaultValue={a.obs} onBlur={e=>actualizarObs(a.id,e.target.value)} placeholder="Sin observación" style={{fontSize:11,padding:"2px 7px",width:"100%",minWidth:140}}/>
                              : <span style={{fontSize:11,color:"var(--t2)",fontStyle:a.obs?"italic":"normal"}}>{a.obs||"—"}</span>
                            }
                          </td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {activosFiltrados.length===0&&(
                  <div style={{padding:"32px",textAlign:"center",color:"var(--t3)",fontSize:12}}>Sin activos que coincidan con el filtro</div>
                )}
              </div>
            </div>

            {/* Escalado de excepciones */}
            {(res.faltante>0||res.sobrante>0||res.deteriorado>0)&&(
              <div className="card" style={{border:`1px solid ${C.amber}40`}}>
                <div className="card-hd" style={{borderBottom:`1px solid ${C.amber}30`}}>
                  <div><div className="ct" style={{color:C.amber}}>⚠ Excepciones a escalar</div><div className="cs">Requieren atención del Jefe de Proyecto</div></div>
                </div>
                <div className="cb">
                  {cc.activos.filter(a=>a.estado!=="conforme").map((a,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:"1px solid var(--bd)"}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:ESTADOS[a.estado]?.dot||C.amber,flexShrink:0,marginTop:4}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{a.codigo} — {a.descripcion}</div>
                        <div style={{fontSize:11,color:"var(--t3)"}}>{ESTADOS[a.estado]?.lbl}{a.obs?" · "+a.obs:""}</div>
                      </div>
                      <span className={`pill ${ESTADOS[a.estado]?.pill||"amber"}`} style={{fontSize:9,flexShrink:0}}>{ESTADOS[a.estado]?.lbl}</span>
                    </div>
                  ))}
                  {canEdit&&(
                    <div style={{marginTop:10}}>
                      <button className="btn btn-p btn-sm" onClick={()=>{exportarReporte();toast("Reporte de excepciones enviado al Jefe de Proyecto","success");}}>
                        {I.dl} Exportar excepciones al Jefe de Proyecto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// RRHH — Gestión de Personal
// ==============================================================================
const RRHH_INIT = [
  {id:"P01",nombre:"Carlos Quispe",   cargo:"Consultor Senior",       area:"Activo Fijo",  email:"cquispe@aquariusconsulting.com.pe",  tel:"+51 999 111 222",tarifa:8.40, disponible:true, proyectosAsig:[],carga:80,certificaciones:["NIIF 13","NIIF 16","SITIA"],ingreso:"2021-03-01",evaluaciones:[{proy:"SIMSA 2025",nota:4.5,comentario:"Excelente gestión en campo"},{proy:"Backus 2024",nota:4.2,comentario:"Buen manejo del equipo"}],epp:[{d:"EPP Mina",est:"en campo"},{d:"Laptop Dell",est:"asignado"}],horasMes:160,horasUsadas:128},
  {id:"P02",nombre:"Ana Torres",      cargo:"Consultor Senior",       area:"Activo Fijo",  email:"atorres@aquariusconsulting.com.pe",  tel:"+51 999 333 444",tarifa:8.40, disponible:true, proyectosAsig:[],carga:75,certificaciones:["NIIF 13","RNT","IVSC"],ingreso:"2020-07-15",evaluaciones:[{proy:"Poderosa 2025",nota:4.7,comentario:"Muy proactiva"},{proy:"Ferreyros 2024",nota:4.0,comentario:"Buena comunicación"}],epp:[{d:"EPP Mina",est:"en campo"},{d:"Laptop HP",est:"asignado"}],horasMes:160,horasUsadas:120},
  {id:"P03",nombre:"María López",     cargo:"Supervisor",             area:"Inventario",   email:"mlopez@aquariusconsulting.com.pe",   tel:"+51 999 555 666",tarifa:5.72, disponible:true, proyectosAsig:[],carga:60,certificaciones:["SITIA","Control de calidad"],ingreso:"2022-01-10",evaluaciones:[{proy:"SIMSA 2025",nota:4.3,comentario:"Buen control de calidad"}],epp:[{d:"EPP básico",est:"en campo"}],horasMes:160,horasUsadas:96},
  {id:"P04",nombre:"Luis Gómez",      cargo:"Supervisor",             area:"Inventario",   email:"lgomez@aquariusconsulting.com.pe",   tel:"+51 999 777 888",tarifa:5.72, disponible:true, proyectosAsig:[],carga:65,certificaciones:["SITIA"],ingreso:"2022-06-01",evaluaciones:[{proy:"Poderosa 2025",nota:4.1,comentario:"Cumplió objetivos"}],epp:[{d:"EPP básico",est:"en campo"}],horasMes:160,horasUsadas:104},
  {id:"P05",nombre:"Rosa Huanca",     cargo:"Asistente Contable",     area:"Contabilidad", email:"rhuanca@aquariusconsulting.com.pe",  tel:"+51 999 000 111",tarifa:4.73, disponible:true, proyectosAsig:[],carga:0, certificaciones:["Contabilidad AF"],ingreso:"2023-03-15",evaluaciones:[],epp:[],horasMes:160,horasUsadas:0},
  {id:"P06",nombre:"Pedro Valdivia",  cargo:"Jefe Soporte",           area:"Operaciones",  email:"pvaldivia@aquariusconsulting.com.pe",tel:"+51 999 222 333",tarifa:10.48,disponible:true, proyectosAsig:[],carga:20,certificaciones:["Gestión de proyectos","NIIF 16"],ingreso:"2019-11-01",evaluaciones:[{proy:"Supermercados 2024",nota:4.6,comentario:"Liderazgo excepcional"}],epp:[{d:"Laptop",est:"oficina"}],horasMes:160,horasUsadas:32},
  {id:"P07",nombre:"Jorge Campos",    cargo:"Asistente de Inventario",area:"Inventario",   email:"jcampos@aquariusconsulting.com.pe",  tel:"+51 999 444 555",tarifa:3.74, disponible:false,proyectosAsig:[],carga:0, certificaciones:[],ingreso:"2023-08-01",evaluaciones:[],epp:[],horasMes:0,horasUsadas:0},
  {id:"P08",nombre:"Roberto Silva",   cargo:"Jefe de Proyecto",       area:"Gerencia",     email:"rsilva@aquariusconsulting.com.pe",   tel:"+51 999 661 220",tarifa:11.25,disponible:true, proyectosAsig:[],carga:40,certificaciones:["PMP","NIIF 13","NIIF 16"],ingreso:"2018-05-01",evaluaciones:[{proy:"SIMSA 2026",nota:4.8,comentario:"Gestión impecable del proyecto"}],epp:[{d:"Laptop HP",est:"oficina"}],horasMes:160,horasUsadas:64},
  {id:"P09",nombre:"Carmen Ríos",     cargo:"Consultor Contable",     area:"Contabilidad", email:"crios@aquariusconsulting.com.pe",    tel:"+51 999 772 331",tarifa:7.40, disponible:true, proyectosAsig:[],carga:50,certificaciones:["NIIF 13","NIIF 16","CPC"],ingreso:"2020-02-10",evaluaciones:[{proy:"Cencosud 2025",nota:4.4,comentario:"Excelente manejo de la conciliación"}],epp:[{d:"Laptop Dell",est:"asignado"}],horasMes:160,horasUsadas:80},
  {id:"P10",nombre:"Marco Palomino",  cargo:"Perito Tasador",         area:"Valuación",    email:"mpalomino@aquariusconsulting.com.pe",tel:"+51 999 883 442",tarifa:21.57,disponible:true, proyectosAsig:[],carga:30,certificaciones:["IVSC","RNT","NIIF 13"],ingreso:"2017-09-15",evaluaciones:[{proy:"Southern Copper 2026",nota:4.9,comentario:"El mejor perito del equipo"}],epp:[{d:"Laptop Lenovo",est:"oficina"}],horasMes:160,horasUsadas:48},
  {id:"P11",nombre:"Patricia Flores", cargo:"Coordinador SIG",        area:"Sistemas",     email:"pflores@aquariusconsulting.com.pe",  tel:"+51 999 994 553",tarifa:9.37, disponible:true, proyectosAsig:[],carga:55,certificaciones:["SITIA","SICEX","AutoCAD"],ingreso:"2021-08-20",evaluaciones:[{proy:"Antamina 2026",nota:4.3,comentario:"Domina el SITIA perfectamente"}],epp:[{d:"Laptop HP",est:"asignado"}],horasMes:160,horasUsadas:88},
  {id:"P12",nombre:"Diego Ccahuana",  cargo:"Asistente de Inventario",area:"Inventario",   email:"dccahuana@aquariusconsulting.com.pe",tel:"+51 999 115 664",tarifa:3.74, disponible:true, proyectosAsig:[],carga:0, certificaciones:["SITIA"],ingreso:"2024-01-15",evaluaciones:[],epp:[],horasMes:160,horasUsadas:0},
];

function RRHH({toast,usuario,proyectos,cotizaciones}) {
  const [personal,setPersonal]     = useState(RRHH_INIT);
  const [selId,setSelId]           = useState("P01");
  const [tab,setTab]               = useState("directorio");
  const [busq,setBusq]             = useState("");
  const [filtCargo,setFiltCargo]   = useState("todos");
  const [modalEval,setModalEval]   = useState(false);
  const [modalNuevo,setModalNuevo] = useState(false);
  const [modalAsig,setModalAsig]   = useState(null);
  const [evalForm,setEvalForm]     = useState({proy:"",nota:5,comentario:""});
  const [nuevoForm,setNuevoForm]   = useState({nombre:"",cargo:"Consultor Senior",area:"Inventario",email:"",tel:"",tarifa:0,certificaciones:""});
  const canEdit = ["Admin","RRHH"].includes(usuario.rol);

  const CARGOS_ALL = ["todos","Jefe de Proyecto","Jefe Soporte","Consultor Senior","Consultor Contable","Supervisor","Coordinador SIG","Asistente Contable","Asistente de Inventario","Perito Tasador"];
  const AREAS = ["Activo Fijo","Inventario","Contabilidad","Valuación","Operaciones","Sistemas","Gerencia"];
  const p = personal.find(x=>x.id===selId)||personal[0];
  const cargaColor = c => c>=90?C.red:c>=60?C.amber:C.teal;
  const notaColor  = n => n>=4.5?C.teal:n>=3.5?C.amber:C.red;

  const filtrados = personal.filter(x=>{
    const mB = !busq||x.nombre.toLowerCase().includes(busq.toLowerCase())||x.cargo.toLowerCase().includes(busq.toLowerCase());
    const mC = filtCargo==="todos"||x.cargo===filtCargo;
    return mB&&mC;
  });

  const promedioNota = evs => evs.length===0?"—":(evs.reduce((a,e)=>a+e.nota,0)/evs.length).toFixed(1);
  const proyEjecucion = proyectos.filter(pr=>["ejecucion","ganado"].includes(pr.estado));

  const horasCotiPorCargo = (proyId, cargo) => {
    const proy = proyectos.find(p=>p.id===proyId);
    const cot  = (cotizaciones||[]).find(c=>c.cliente===proy?.cliente&&c.estado==="ganado");
    const cp   = (cot?.personal||[]).find(p=>p.cargo.toLowerCase().includes(cargo.toLowerCase().split(" ")[0]));
    return cp ? (cp.horas||0) : 0;
  };

  const agregarEval = () => {
    if(!evalForm.proy.trim()){toast("Ingresa el nombre del proyecto","error");return;}
    setPersonal(prev=>prev.map(x=>x.id===selId?{...x,evaluaciones:[{proy:evalForm.proy,nota:evalForm.nota,comentario:evalForm.comentario},...x.evaluaciones]}:x));
    toast("✓ Evaluación registrada","success");
    setModalEval(false); setEvalForm({proy:"",nota:5,comentario:""});
  };

  const agregarPersonal = () => {
    if(!nuevoForm.nombre.trim()||!nuevoForm.email.trim()){toast("Nombre y email son obligatorios","error");return;}
    const nuevo = {id:"P"+Date.now(),nombre:nuevoForm.nombre.trim(),cargo:nuevoForm.cargo,area:nuevoForm.area,email:nuevoForm.email.trim(),tel:nuevoForm.tel.trim(),tarifa:parseFloat(nuevoForm.tarifa)||0,disponible:true,proyectosAsig:[],carga:0,certificaciones:nuevoForm.certificaciones?nuevoForm.certificaciones.split(",").map(c=>c.trim()).filter(Boolean):[],ingreso:new Date().toISOString().split("T")[0],evaluaciones:[],epp:[],horasMes:160,horasUsadas:0};
    setPersonal(prev=>[...prev,nuevo]);
    setModalNuevo(false);
    setNuevoForm({nombre:"",cargo:"Consultor Senior",area:"Inventario",email:"",tel:"",tarifa:0,certificaciones:""});
    toast("✓ Personal agregado: "+nuevo.nombre,"success");
  };

  const asignarAProyecto = (personaId, proyId, horasCot) => {
    const proy = proyectos.find(p=>p.id===proyId);
    setPersonal(prev=>prev.map(x=>{
      if(x.id!==personaId) return x;
      if((x.proyectosAsig||[]).find(a=>a.proyId===proyId)) return x;
      const horas = horasCot||horasCotiPorCargo(proyId,x.cargo);
      const nuevaCarga = Math.min(100, x.carga + Math.round(horas/x.horasMes*100));
      return {...x,proyectosAsig:[...(x.proyectosAsig||[]),{proyId,cliente:proy?.cliente||"",horas,horasUsadas:0}],carga:nuevaCarga,horasUsadas:x.horasUsadas+(horas||0)};
    }));
    toast("✓ "+((personal.find(x=>x.id===personaId)||{}).nombre||"Personal")+" asignado a "+(proy?.cliente||proyId),"success");
    setModalAsig(null);
  };

  const desasignar = (personaId, proyId) => {
    setPersonal(prev=>prev.map(x=>{
      if(x.id!==personaId) return x;
      const asig = (x.proyectosAsig||[]).find(a=>a.proyId===proyId);
      return {...x,proyectosAsig:(x.proyectosAsig||[]).filter(a=>a.proyId!==proyId),carga:Math.max(0,x.carga-Math.round((asig?.horas||0)/x.horasMes*100)),horasUsadas:Math.max(0,x.horasUsadas-(asig?.horas||0))};
    }));
    toast("✓ Asignación removida","success");
  };

  return(
    <div>
      {/* Modal Evaluación */}
      {modalEval&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalEval(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Nueva Evaluación — {p?.nombre}</div>
              <button onClick={()=>setModalEval(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
              <div><label className="fl">Proyecto *</label><input value={evalForm.proy} onChange={e=>setEvalForm(f=>({...f,proy:e.target.value}))} placeholder="Ej: SIMSA 2026"/></div>
              <div>
                <label className="fl">Nota (1-5): <strong style={{color:notaColor(evalForm.nota)}}>{evalForm.nota}</strong></label>
                <input type="range" min="1" max="5" step="0.5" value={evalForm.nota} onChange={e=>setEvalForm(f=>({...f,nota:parseFloat(e.target.value)}))} style={{width:"100%",marginTop:6}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t3)"}}><span>1 — Deficiente</span><span>3 — Bueno</span><span>5 — Excelente</span></div>
              </div>
              <div><label className="fl">Comentario</label><textarea value={evalForm.comentario} onChange={e=>setEvalForm(f=>({...f,comentario:e.target.value}))} rows={3} style={{resize:"vertical"}} placeholder="Observaciones…"/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalEval(false)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={agregarEval}>{I.check} Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Nuevo Personal */}
      {modalNuevo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalNuevo(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:520,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"var(--card)",zIndex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Agregar personal</div>
              <button onClick={()=>setModalNuevo(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><label className="fl">Nombre completo *</label><input value={nuevoForm.nombre} onChange={e=>setNuevoForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Juan Pérez Ramos"/></div>
              <div><label className="fl">Cargo *</label><select value={nuevoForm.cargo} onChange={e=>setNuevoForm(f=>({...f,cargo:e.target.value}))}>{CARGOS_ALL.filter(c=>c!=="todos").map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="fl">Área</label><select value={nuevoForm.area} onChange={e=>setNuevoForm(f=>({...f,area:e.target.value}))}>{AREAS.map(a=><option key={a} value={a}>{a}</option>)}</select></div>
              <div><label className="fl">Email *</label><input type="email" value={nuevoForm.email} onChange={e=>setNuevoForm(f=>({...f,email:e.target.value}))} placeholder="usuario@aquariusconsulting.com.pe"/></div>
              <div><label className="fl">Teléfono</label><input value={nuevoForm.tel} onChange={e=>setNuevoForm(f=>({...f,tel:e.target.value}))} placeholder="+51 999 000 000"/></div>
              <div><label className="fl">Tarifa USD/hora</label><input type="number" step="0.01" min="0" value={nuevoForm.tarifa||""} onChange={e=>setNuevoForm(f=>({...f,tarifa:e.target.value}))} placeholder="0.00"/></div>
              <div style={{gridColumn:"1/-1"}}><label className="fl">Certificaciones (separadas por coma)</label><input value={nuevoForm.certificaciones} onChange={e=>setNuevoForm(f=>({...f,certificaciones:e.target.value}))} placeholder="NIIF 13, SITIA, PMP"/></div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--bd)",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button className="btn btn-s btn-sm" onClick={()=>setModalNuevo(false)}>Cancelar</button>
              <button className="btn btn-p btn-sm" onClick={agregarPersonal}>{I.plus} Agregar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Asignación */}
      {modalAsig&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalAsig(null);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:500,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Asignar a proyecto</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{(personal.find(x=>x.id===modalAsig.personaId)||{}).nombre}</div></div>
              <button onClick={()=>setModalAsig(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:10}}>
              {proyEjecucion.length===0
                ? <div style={{textAlign:"center",padding:24,color:"var(--t3)",fontSize:12}}>No hay proyectos en ejecución.</div>
                : proyEjecucion.map(proy=>{
                  const persona   = personal.find(x=>x.id===modalAsig.personaId);
                  const yaAsig    = (persona?.proyectosAsig||[]).some(a=>a.proyId===proy.id);
                  const horasCot  = horasCotiPorCargo(proy.id, persona?.cargo||"");
                  return(
                    <div key={proy.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:"var(--hv)",borderRadius:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--t1)"}}>{proy.cliente}</div>
                        <div style={{fontSize:10,color:"var(--t3)"}}>{proy.id} · {proy.estado}</div>
                        {horasCot>0&&<div style={{fontSize:10,color:C.blue,marginTop:2}}>Cotizadas: <strong>{horasCot}h</strong></div>}
                      </div>
                      {yaAsig
                        ? <button className="btn btn-r btn-sm" onClick={()=>desasignar(modalAsig.personaId,proy.id)}>Quitar</button>
                        : <button className="btn btn-p btn-sm" onClick={()=>asignarAProyecto(modalAsig.personaId,proy.id,horasCot)}>Asignar</button>
                      }
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">RRHH — Gestión de Personal</div><div className="ss">{personal.filter(x=>x.disponible).length} activos · {personal.filter(x=>(x.proyectosAsig||[]).length>0).length} asignados a proyectos</div></div>
        {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalNuevo(true)}>{I.plus} Agregar personal</button>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Total personal",  v:personal.length, col:"blue"},
          {l:"Asignados",       v:personal.filter(x=>(x.proyectosAsig||[]).length>0).length, col:"navy"},
          {l:"Disponibles",     v:personal.filter(x=>x.disponible&&(x.proyectosAsig||[]).length===0).length, col:"teal"},
          {l:"Carga promedio",  v:Math.round(personal.filter(x=>x.disponible).reduce((a,x)=>a+x.carga,0)/Math.max(personal.filter(x=>x.disponible).length,1))+"%", col:"amber"},
          {l:"Horas asignadas", v:personal.reduce((a,x)=>a+(x.proyectosAsig||[]).reduce((b,pa)=>b+(pa.horas||0),0),0)+"h", col:"blue"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      <Tabs tabs={[{id:"directorio",lbl:"Directorio"},{id:"asignacion",lbl:"Asignación"},{id:"carga",lbl:"Carga de trabajo"},{id:"evaluaciones",lbl:"Evaluaciones"}]} active={tab} onChange={setTab}/>

      {/* Directorio */}
      {tab==="directorio"&&(
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,alignItems:"start"}}>
          <div className="card">
            <div className="card-hd"><div className="ct">Personal ({filtrados.length})</div></div>
            <div style={{padding:"8px 12px",borderBottom:"1px solid var(--bd)",display:"flex",flexDirection:"column",gap:6}}>
              <input value={busq} onChange={e=>setBusq(e.target.value)} placeholder="Buscar…" style={{fontSize:11,padding:"5px 9px"}}/>
              <select value={filtCargo} onChange={e=>setFiltCargo(e.target.value)} style={{fontSize:11,padding:"4px 8px"}}>{CARGOS_ALL.map(c=><option key={c} value={c}>{c==="todos"?"Todos los cargos":c}</option>)}</select>
            </div>
            {filtrados.map(x=>(
              <div key={x.id} onClick={()=>setSelId(x.id)} style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",cursor:"pointer",background:selId===x.id?"rgba(74,159,212,.06)":"transparent",borderLeft:selId===x.id?`3px solid ${C.blue}`:"3px solid transparent",transition:"background .1s"}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:x.disponible?C.blue:"#6b7280",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>{x.nombre.split(" ").map(n=>n[0]).join("").substring(0,2)}</div>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:"var(--t1)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.nombre}</div><div style={{fontSize:10,color:"var(--t3)"}}>{x.cargo}</div></div>
                  <span className={`pill ${x.disponible&&(x.proyectosAsig||[]).length===0?"teal":(x.proyectosAsig||[]).length>0?"amber":"navy"}`} style={{fontSize:9}}>{!x.disponible?"Inactivo":(x.proyectosAsig||[]).length>0?`${(x.proyectosAsig||[]).length} proy.`:"Libre"}</span>
                </div>
                <div style={{marginTop:5}}><PBar pct={x.carga} color={cargaColor(x.carga)} height={3}/></div>
              </div>
            ))}
          </div>
          {p&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card">
                <div className="card-hd">
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:p.disponible?C.blue:"#6b7280",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,flexShrink:0}}>{p.nombre.split(" ").map(n=>n[0]).join("").substring(0,2)}</div>
                    <div><div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>{p.nombre}</div><div style={{fontSize:12,color:"var(--t3)"}}>{p.cargo} · {p.area||"—"} · Desde {new Date(p.ingreso).toLocaleDateString("es-PE",{month:"short",year:"numeric"})}</div></div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalAsig({personaId:p.id})}>📋 Asignar</button>}
                    {canEdit&&<button className={`btn btn-sm ${p.disponible?"btn-r":"btn-g"}`} onClick={()=>{setPersonal(prev=>prev.map(x=>x.id===p.id?{...x,disponible:!x.disponible}:x));toast("Estado actualizado","success");}}>{p.disponible?"Desactivar":"Activar"}</button>}
                    <span className={`pill ${p.disponible?"teal":"navy"}`}>{p.disponible?"Activo":"Inactivo"}</span>
                  </div>
                </div>
                <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["Email",p.email],["Teléfono",p.tel],["Tarifa","USD "+p.tarifa+"/h"],["Área",p.area||"—"]].map(([l,v],i)=>(
                    <div key={i}><div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{l}</div><div style={{fontSize:12,color:"var(--t1)",fontWeight:500}}>{v}</div></div>
                  ))}
                </div>
                <div style={{padding:"0 16px 14px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Certificaciones</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {(p.certificaciones||[]).length>0?p.certificaciones.map((c,i)=><span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(74,159,212,.1)",color:C.blue,fontWeight:600,border:"1px solid rgba(74,159,212,.2)"}}>{c}</span>):<span style={{fontSize:11,color:"var(--t3)"}}>Sin certificaciones</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div className="card">
                  <div className="card-hd"><div className="ct">Horas y carga</div></div>
                  <div className="cb">
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"var(--t2)"}}>Horas usadas/mes</span><span className="mono" style={{fontWeight:700,color:cargaColor(pct(p.horasUsadas,p.horasMes))}}>{p.horasUsadas}h / {p.horasMes}h</span></div>
                    <PBar pct={pct(p.horasUsadas,p.horasMes)} color={cargaColor(pct(p.horasUsadas,p.horasMes))}/>
                    <div style={{marginTop:10,padding:"8px 10px",background:"var(--hv)",borderRadius:"var(--r)"}}><div style={{fontSize:10,color:"var(--t3)",marginBottom:2}}>Carga actual</div><div className="mono" style={{fontSize:18,fontWeight:800,color:cargaColor(p.carga)}}>{p.carga}%</div></div>
                    {(p.proyectosAsig||[]).length>0&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",marginBottom:6}}>Proyectos asignados</div>
                        {(p.proyectosAsig||[]).map((a,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--bd)",fontSize:11}}>
                            <span style={{color:"var(--t1)",fontWeight:600}}>{a.cliente||a.proyId}</span>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <span className="mono" style={{color:C.blue,fontWeight:700}}>{a.horas||0}h</span>
                              {canEdit&&<button onClick={()=>desasignar(p.id,a.proyId)} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12}}>×</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="card-hd"><div className="ct">EPP asignado</div></div>
                  {(p.epp||[]).length>0?<table><thead><tr><th>Equipo</th><th>Estado</th></tr></thead><tbody>{(p.epp||[]).map((e,i)=><tr key={i}><td style={{fontSize:12}}>{e.d}</td><td><span style={{fontSize:10,fontWeight:700,color:e.est==="en campo"?C.amber:e.est==="asignado"?C.teal:"var(--t3)"}}>● {e.est}</span></td></tr>)}</tbody></table>:<div style={{padding:"20px",textAlign:"center",color:"var(--t3)",fontSize:12}}>Sin EPP asignado</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asignación a proyectos */}
      {tab==="asignacion"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {proyEjecucion.length===0?(
            <div className="card" style={{padding:32,textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:600,color:"var(--t1)"}}>Sin proyectos en ejecución</div></div>
          ):proyEjecucion.map(proy=>{
            const cot = (cotizaciones||[]).find(c=>c.cliente===proy.cliente&&c.estado==="ganado");
            const cargosCot = (cot?.personal||[]);
            const asignadosEnProy = personal.filter(x=>(x.proyectosAsig||[]).some(a=>a.proyId===proy.id));
            return(
              <div key={proy.id} className="card" style={{padding:16}}>
                <div className="card-hd" style={{marginBottom:12}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{proy.cliente}</div><div style={{fontSize:11,color:"var(--t3)"}}>{proy.id} · {proy.proyecto} · Inicio: {proy.inicio||"—"}</div></div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><span className="pill teal">{proy.estado}</span><span className="mono" style={{fontSize:12,fontWeight:700,color:C.teal}}>${(proy.valor||0).toLocaleString()}</span></div>
                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>{["Cargo cotizado","Horas","Cant.","Personal asignado","Asignar"].map(h=><th key={h} style={{padding:"6px 10px",color:"#fff",fontWeight:600}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {cargosCot.map((cp,i)=>{
                      const asigCargo = asignadosEnProy.filter(x=>x.cargo.toLowerCase().includes(cp.cargo.toLowerCase().split(" ")[0]));
                      const disponCargo = personal.filter(x=>x.disponible&&x.cargo.toLowerCase().includes(cp.cargo.toLowerCase().split(" ")[0])&&!(x.proyectosAsig||[]).some(a=>a.proyId===proy.id));
                      return(
                        <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                          <td style={{padding:"6px 10px",fontWeight:600}}>{cp.cargo}</td>
                          <td style={{padding:"6px 10px",fontFamily:"var(--mono)",color:C.blue}}>{cp.horas}h</td>
                          <td style={{padding:"6px 10px"}}>×{cp.cant||1}</td>
                          <td style={{padding:"6px 10px"}}>
                            {asigCargo.length>0
                              ?<div style={{display:"flex",flexWrap:"wrap",gap:4}}>{asigCargo.map(x=><span key={x.id} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(29,158,117,.1)",color:C.teal,fontWeight:600}}>{x.nombre}<span onClick={()=>desasignar(x.id,proy.id)} style={{marginLeft:4,cursor:"pointer",color:C.red}}>×</span></span>)}</div>
                              :<span style={{fontSize:10,color:C.amber,fontWeight:600}}>⚠ Sin asignar</span>
                            }
                          </td>
                          <td style={{padding:"6px 10px"}}>
                            {canEdit&&disponCargo.length>0&&<select style={{fontSize:10,padding:"2px 6px",maxWidth:140}} defaultValue="" onChange={e=>{if(e.target.value)asignarAProyecto(e.target.value,proy.id,cp.horas);e.target.value="";}}><option value="">+ Asignar…</option>{disponCargo.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select>}
                          </td>
                        </tr>
                      );
                    })}
                    {cargosCot.length===0&&<tr><td colSpan={5} style={{padding:"16px",textAlign:"center",color:"var(--t3)",fontSize:11}}>Sin personal en la cotización vinculada</td></tr>}
                  </tbody>
                </table>
                <div style={{marginTop:8,fontSize:11,color:"var(--t3)"}}>Asignados: <strong style={{color:C.teal}}>{asignadosEnProy.length}</strong>{cot&&<span> · Cotización: <span className="mono" style={{color:C.blue}}>{cot.id}</span></span>}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Carga de trabajo */}
      {tab==="carga"&&(
        <div className="card">
          <div className="card-hd"><div><div className="ct">Carga y disponibilidad del equipo</div><div className="cs">Horas asignadas por persona y proyecto</div></div></div>
          <table>
            <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>{["Consultor","Cargo","Área","USD/h","Proyectos activos","Horas asig.","Carga","Estado"].map(h=><th key={h} style={{padding:"7px 10px",color:"#fff",fontWeight:600}}>{h}</th>)}</tr></thead>
            <tbody>
              {personal.map((x,i)=>{
                const horasTotal=(x.proyectosAsig||[]).reduce((a,pa)=>a+(pa.horas||0),0);
                return(
                  <tr key={x.id} onClick={()=>{setSelId(x.id);setTab("directorio");}} style={{cursor:"pointer",background:i%2===0?"transparent":"var(--hv)"}}>
                    <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:26,height:26,borderRadius:"50%",background:x.disponible?C.blue:"#6b7280",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>{x.nombre.split(" ").map(n=>n[0]).join("").substring(0,2)}</div><span style={{fontWeight:600,fontSize:12}}>{x.nombre}</span></div></td>
                    <td style={{fontSize:11,color:"var(--t2)"}}>{x.cargo}</td>
                    <td style={{fontSize:11,color:"var(--t3)"}}>{x.area||"—"}</td>
                    <td className="mono" style={{fontSize:11}}>${x.tarifa}</td>
                    <td>{(x.proyectosAsig||[]).length>0?(x.proyectosAsig||[]).map(a=><span key={a.proyId} className="pill blue" style={{marginRight:3,fontSize:9}}>{(a.cliente||a.proyId).substring(0,14)}</span>):<span style={{fontSize:11,color:"var(--t3)"}}>—</span>}</td>
                    <td className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{horasTotal>0?horasTotal+"h":"—"}</td>
                    <td style={{width:100}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1}}><PBar pct={x.carga} color={cargaColor(x.carga)} height={5}/></div><span className="mono" style={{fontSize:10,fontWeight:700,color:cargaColor(x.carga),width:32,textAlign:"right"}}>{x.carga}%</span></div></td>
                    <td><span className={`pill ${x.disponible?(x.proyectosAsig||[]).length>0?"amber":"teal":"navy"}`} style={{fontSize:9}}>{!x.disponible?"Inactivo":(x.proyectosAsig||[]).length>0?"En proyecto":"Libre"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Evaluaciones */}
      {tab==="evaluaciones"&&(
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:14,alignItems:"start"}}>
          <div className="card">
            <div className="card-hd"><div className="ct">Personal</div></div>
            {personal.map(x=>(
              <div key={x.id} onClick={()=>setSelId(x.id)} style={{padding:"10px 14px",borderBottom:"1px solid var(--bd)",cursor:"pointer",background:selId===x.id?"rgba(74,159,212,.06)":"transparent",borderLeft:selId===x.id?`3px solid ${C.blue}`:"3px solid transparent"}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{x.nombre}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontSize:10,color:"var(--t3)"}}>{x.cargo}</span><span style={{fontSize:10,fontWeight:700,color:notaColor(parseFloat(promedioNota(x.evaluaciones))||0)}}>{promedioNota(x.evaluaciones)} ★</span></div>
              </div>
            ))}
          </div>
          {p&&(
            <div className="card">
              <div className="card-hd"><div><div className="ct">Evaluaciones — {p.nombre}</div><div className="cs">Promedio: <strong style={{color:notaColor(parseFloat(promedioNota(p.evaluaciones))||0)}}>{promedioNota(p.evaluaciones)}</strong> / 5.0</div></div>{canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalEval(true)}>{I.plus} Nueva evaluación</button>}</div>
              {p.evaluaciones.length>0?p.evaluaciones.map((e,i)=>(
                <div key={i} style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)",display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:"var(--r)",background:notaColor(e.nota)+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span className="mono" style={{fontSize:14,fontWeight:800,color:notaColor(e.nota)}}>{e.nota}</span></div>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"var(--t1)",marginBottom:2}}>{e.proy}</div><div style={{fontSize:11,color:"var(--t2)",fontStyle:"italic"}}>"{e.comentario}"</div></div>
                </div>
              )):<div style={{padding:"24px",textAlign:"center",color:"var(--t3)",fontSize:12}}>Sin evaluaciones registradas</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function Facturacion({proyectos,setProyectos,toast,usuario}) {
  // Derivar facturas de los cobros de proyectos (fuente de verdad única)
  const facturas = (proyectos||[]).flatMap(p=>
    (p.cobros||[]).map((c,i)=>({
      id: "F-"+(p.id||"X")+"-C"+(c.n||i+1),
      proy: p.id,
      cliente: p.cliente,
      ruc: p.ruc||"—",
      fecha: c.fecha||new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),
      vencimiento: c.fecha ? new Date(new Date(c.fecha).getTime()+30*24*3600*1000).toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—",
      monto: c.monto||0,
      estado: c.estado==="cobrado"||c.estado==="pagado" ? "cobrada" : "pendiente",
      cuota: c.n||i+1,
      totalCuotas: (p.cobros||[]).length,
      concepto: (c.concepto)||(p.proyecto||p.cliente)+" — Cuota "+(c.n||i+1)+"/"+(p.cobros||[]).length,
      comprobante: c.comprobante||null,
      fechaCobro: c.fechaCobro||null,
      banco: c.banco||null,
      voucher: c.voucher||null,
      referencia: c.referencia||null,
    }))
  );

  // setFacturas: actualiza el cobro en el proyecto correspondiente
  const setFacturas = (updaterOrArr) => {
    // No se usa directamente — los cambios van por registrarCobro→setProyectos
  };
  const [sel,setSel]           = useState(null);
  const [tab,setTab]           = useState("lista");
  const [filtEst,setFiltEst]   = useState("todos");
  const [filtCliente,setFiltCliente] = useState("todos");
  const [modalCobro,setModalCobro]   = useState(null);
  const [cobroForm,setCobroForm]     = useState({fechaCobro:"",voucher:"",banco:"BCP",referencia:""});
  const canEdit = ["Admin","Gerencia"].includes(usuario.rol);
  const BANCOS = ["BCP","Interbank","BBVA","Scotiabank","BanBif","Otro"];

  const HOY = new Date();
  const clientes = [...new Set(facturas.map(f=>f.cliente))];

  const filtradas = facturas.filter(f=>{
    const mE = filtEst==="todos"||f.estado===filtEst;
    const mC = filtCliente==="todos"||f.cliente===filtCliente;
    return mE&&mC;
  });

  const totalCobrado   = facturas.filter(f=>f.estado==="cobrada").reduce((a,f)=>a+f.monto,0);
  const totalPendiente = facturas.filter(f=>f.estado==="pendiente").reduce((a,f)=>a+f.monto,0);
  const vencidas       = facturas.filter(f=>f.estado==="pendiente"&&new Date(f.vencimiento.split("/").reverse().join("-"))<HOY);
  const proximas7d     = facturas.filter(f=>{
    if(f.estado!=="pendiente") return false;
    const d = Math.ceil((new Date(f.vencimiento.split("/").reverse().join("-"))-HOY)/(1000*60*60*24));
    return d>=0&&d<=7;
  });

  const revertirCobro = (facId) => {
    const fact = facturas.find(f=>f.id===facId);
    if(!fact) return;
    setProyectos(prev=>prev.map(p=>{
      if(p.id!==fact.proy) return p;
      const nuevosCobros=(p.cobros||[]).map(c=>
        c.n===fact.cuota ? {...c,estado:"pendiente",fechaCobro:null,voucher:"",banco:"",referencia:""} : c
      );
      const cobrado=nuevosCobros.filter(c=>c.estado==="cobrado").reduce((a,c)=>a+c.monto,0);
      return {...p,cobros:nuevosCobros,cobrado,pendiente:p.valor-cobrado};
    }));
    toast("↩ Cobro revertido a Pendiente","success");
  };
  const registrarCobro = () => {
    if(!cobroForm.fechaCobro){toast("Ingresa la fecha de cobro","error");return;}
    if(!cobroForm.voucher.trim()){toast("Ingresa el N° de voucher","error");return;}
    // Encontrar la factura y actualizar el cobro en el proyecto
    const fact = facturas.find(f=>f.id===modalCobro);
    if(fact && setProyectos){
      setProyectos(prev=>prev.map(p=>{
        if(p.id!==fact.proy) return p;
        const nuevosCobros = (p.cobros||[]).map(c=>
          c.n===fact.cuota ? {
            ...c,
            estado:"cobrado",
            fechaCobro:cobroForm.fechaCobro,
            voucher:cobroForm.voucher,
            banco:cobroForm.banco,
            referencia:cobroForm.referencia,
            comprobante:cobroForm.voucher,
          } : c
        );
        const cobrado = nuevosCobros.filter(c=>c.estado==="cobrado").reduce((a,c)=>a+c.monto,0);
        return {...p, cobros:nuevosCobros, cobrado, pendiente:p.valor-cobrado};
      }));
    }
    if(sel&&sel.id===modalCobro) setSel(prev=>({...prev,estado:"cobrada",fechaCobro:cobroForm.fechaCobro,voucher:cobroForm.voucher,banco:cobroForm.banco}));
    toast("✓ Cobro registrado — Proyecto actualizado","success");
    setModalCobro(null);
    setCobroForm({fechaCobro:"",voucher:"",banco:"BCP",referencia:""});
  };

  const EST_COL = {cobrada:"teal",pendiente:"amber",vencida:"red"};
  const estadoReal = (f) => {
    if(f.estado==="cobrada"||f.estado==="cobrado") return "cobrada";
    if(!f.vencimiento||f.vencimiento==="—") return "pendiente";
    try {
      const parts = f.vencimiento.includes("/")
        ? f.vencimiento.split("/").reverse().join("-")
        : f.vencimiento;
      if(new Date(parts)<HOY) return "vencida";
    } catch(e){}
    return "pendiente";
  };

  return(
    <div>
      {/* MODAL REGISTRAR COBRO */}
      {modalCobro&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalCobro(null);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:420,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Registrar cobro</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{facturas.find(f=>f.id===modalCobro)?.concepto}</div></div>
              <button onClick={()=>setModalCobro(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{padding:"12px 14px",background:"var(--hv)",borderRadius:"var(--r)",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:"var(--t2)"}}>Monto a cobrar</span>
                <span className="mono" style={{fontSize:16,fontWeight:800,color:C.blue}}>{"$"+fi(facturas.find(f=>f.id===modalCobro)?.monto||0)}</span>
              </div>
              <div><label className="fl">Fecha de cobro *</label><input type="date" value={cobroForm.fechaCobro} onChange={e=>setCobroForm(p=>({...p,fechaCobro:e.target.value}))}/></div>
              <div><label className="fl">Banco</label>
                <select value={cobroForm.banco} onChange={e=>setCobroForm(p=>({...p,banco:e.target.value}))}>
                  {BANCOS.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div><label className="fl">N° Voucher / Operación *</label><input value={cobroForm.voucher} onChange={e=>setCobroForm(p=>({...p,voucher:e.target.value}))} placeholder="Ej: 00123456"/></div>
              <div><label className="fl">Referencia adicional</label><input value={cobroForm.referencia} onChange={e=>setCobroForm(p=>({...p,referencia:e.target.value}))} placeholder="Ej: TRF-20260403-001 (opcional)"/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalCobro(null)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={registrarCobro}>{I.check} Confirmar cobro</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Facturación y Cobros</div><div className="ss">{facturas.length} facturas · {vencidas.length} vencidas · {proximas7d.length} próximas a vencer</div></div>
        <button className="btn btn-s btn-sm" onClick={()=>{
          const pctCobFact=totalCobrado+totalPendiente>0?Math.round(totalCobrado/(totalCobrado+totalPendiente)*100):0;
          const r2=44,cx=55,cy=55,ci=2*Math.PI*r2;
          const dF='<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+(pctCobFact>=70?"#1D9E75":"#BA7517")+'" stroke-width="12" stroke-dasharray="'+(ci*pctCobFact/100)+' '+(ci*(1-pctCobFact/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1E293B" font-size="15" font-weight="800" text-anchor="middle">'+pctCobFact+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">cobrado</text></svg>';
          const tabF='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">ID Factura</th><th style="padding:7px">Cliente</th><th style="padding:7px;text-align:right">Monto USD</th><th style="padding:7px;text-align:center">Fecha</th><th style="padding:7px;text-align:center">Estado</th></tr>'+facturas.map((f,i)=>{const est=estadoReal(f);const col=est==="pagada"||est==="cobrada"?"#166534":est==="vencida"?"#991b1b":"#92400e";return'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:6px 10px;font-family:monospace;color:#4a9fd4;font-weight:700">'+f.id+'</td><td style="padding:6px 10px">'+f.cliente+'</td><td style="padding:6px;text-align:right;font-family:monospace;font-weight:600">$'+fi(f.monto)+'</td><td style="padding:6px;text-align:center;font-size:10px">'+fmtFecha(f.fecha)+'</td><td style="padding:6px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">'+est.toUpperCase()+'</span></td></tr>';}).join('')+'</table>';
          generarPDFRico({
            nombre:"Estado_Facturacion_"+new Date().toLocaleDateString("es-PE").replace(/\//g,"-"),
            titulo:"Estado de Facturación y Cobros",
            subtitulo:"Nexova CRM Pro · "+facturas.length+" facturas activas",
            kpis:[{label:"Total cobrado",value:"$"+fi(totalCobrado),color:"#1D9E75"},{label:"Total pendiente",value:"$"+fi(totalPendiente),color:"#BA7517"},{label:"Facturas vencidas",value:vencidas.length,color:vencidas.length>0?"#E24B4A":"#1D9E75"},{label:"Próximas 7 días",value:proximas7d.length,color:proximas7d.length>0?"#BA7517":"#1D9E75"}],
            secciones:[
              {titulo:"Estado de cobranza",contenido:'<div style="display:flex;gap:20px;align-items:center">'+dF+'<div style="font-size:12px;line-height:2.4;flex:1">Cobrado: <strong style="color:#1D9E75">$'+fi(totalCobrado)+'</strong><br/>Pendiente: <strong style="color:#BA7517">$'+fi(totalPendiente)+'</strong><br/>Vencidas: <strong style="color:#E24B4A">'+vencidas.length+'</strong><br/>Por vencer (7d): <strong style="color:#BA7517">'+proximas7d.length+'</strong></div></div>'},
              {titulo:"Detalle de facturas",contenido:tabF},
            ],
            analisis:{
              situacion:"Estado de facturación al día de hoy: <strong>"+facturas.length+" facturas</strong> con USD <strong>"+fi(totalCobrado)+"</strong> cobrado y <strong>USD "+fi(totalPendiente)+"</strong> pendiente. Efectividad de cobranza: <strong>"+pctCobFact+"%</strong>.",
              riesgos:vencidas.length>0?"<strong>"+vencidas.length+" factura(s) vencida(s)</strong> pendientes de cobro. Activar proceso de cobranza urgente."+(proximas7d.length>0?" Además "+proximas7d.length+" factura(s) vencen en los próximos 7 días.":""):undefined,
              recomendaciones:"<strong>1.</strong> Contactar al cliente para el pago de las "+vencidas.length+" facturas vencidas.<br/><strong>2.</strong> Programar recordatorios 3 días antes de cada vencimiento.<br/><strong>3.</strong> Emitir la factura del siguiente hito al completar la fase del proyecto.<br/><strong>4.</strong> Revisar el cronograma de cobros con el equipo comercial."
            }
          });
          toast("✓ Reporte facturación con gráficas generado","success");
        }}>{I.dl} Reporte</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Total facturado",   v:"$"+fi(facturas.reduce((a,f)=>a+f.monto,0)), col:"blue"},
          {l:"Cobrado",           v:"$"+fi(totalCobrado),   col:"teal"},
          {l:"Por cobrar",        v:"$"+fi(totalPendiente), col:"amber"},
          {l:"Vencidas",          v:vencidas.length,        col:vencidas.length>0?"red":"teal"},
          {l:"Vencen en 7 días",  v:proximas7d.length,      col:proximas7d.length>0?"amber":"teal"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      <Tabs tabs={[{id:"lista",lbl:"Todas las facturas"},{id:"porCliente",lbl:"Por cliente"},{id:"flujo",lbl:"Flujo de caja"}]} active={tab} onChange={setTab}/>

      {/* -- LISTA -- */}
      {tab==="lista"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14,alignItems:"start"}}>
          <div className="card">
            <div className="card-hd">
              <div className="ct">Facturas</div>
              <div style={{display:"flex",gap:8}}>
                <select value={filtCliente} onChange={e=>setFiltCliente(e.target.value)} style={{fontSize:11,padding:"3px 7px",width:"auto"}}>
                  <option value="todos">Todos los clientes</option>
                  {clientes.map(c=><option key={c} value={c}>{c.substring(0,25)}</option>)}
                </select>
                <select value={filtEst} onChange={e=>setFiltEst(e.target.value)} style={{fontSize:11,padding:"3px 7px",width:"auto"}}>
                  <option value="todos">Todos</option>
                  <option value="cobrada">Cobradas</option>
                  <option value="pendiente">Pendientes</option>
                </select>
              </div>
            </div>
            <table>
              <thead><tr><th>N° Factura</th><th>Cliente</th><th>Concepto</th><th>Vencimiento</th><th style={{textAlign:"right"}}>Monto</th><th>Estado</th><th style={{textAlign:"center"}}>Acción</th></tr></thead>
              <tbody>
                {filtradas.map(f=>{
                  const est = estadoReal(f);
                  return(
                    <tr key={f.id} onClick={()=>setSel(f)} style={{cursor:"pointer",background:sel&&sel.id===f.id?"rgba(74,159,212,.05)":"transparent"}}>
                      <td><span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{f.id}</span></td>
                      <td style={{fontSize:11}}>{f.cliente.substring(0,20)}</td>
                      <td style={{fontSize:11,color:"var(--t2)"}}>{f.concepto.substring(0,30)}…</td>
                      <td style={{fontSize:11,color:est==="vencida"?C.red:"var(--t2)"}}>{f.vencimiento}</td>
                      <td className="mono" style={{textAlign:"right",fontWeight:700}}>{"$"+fi(f.monto)}</td>
                      <td><span className={"pill "+EST_COL[est]}>{est}</span></td>
                      <td style={{textAlign:"center"}}>
                        {f.estado!=="cobrada"&&canEdit&&(
                          <button className="btn btn-g btn-xs" onClick={e=>{e.stopPropagation();setModalCobro(f.id);}}>{I.check} Cobrar</button>
                        )}
                        {f.estado==="cobrada"&&canEdit&&(
                          <button className="btn btn-r btn-xs" style={{fontSize:10,marginRight:4}}
                            onClick={e=>{e.stopPropagation();if(window.confirm("¿Revertir cobro de "+f.cliente+"? Volverá a Pendiente."))revertirCobro(f.id);}}>
                            ↩ Revertir
                          </button>
                        )}
                        {f.estado==="cobrada"&&<span style={{fontSize:10,color:C.teal}}>✓</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detalle factura */}
          {sel?(
            <div className="card">
              <div className="card-hd"><div><div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700}}>{sel.id}</div><div className="ct" style={{fontSize:13}}>{sel.cliente}</div></div><span className={"pill "+EST_COL[estadoReal(sel)]}>{estadoReal(sel)}</span></div>
              <div className="cb" style={{display:"flex",flexDirection:"column",gap:10}}>
                {[["Proyecto",sel.proy],["RUC",sel.ruc],["Concepto",sel.concepto],["Fecha emisión",sel.fecha],["Vencimiento",sel.vencimiento],["Cuota",sel.cuota+"/"+sel.totalCuotas]].map(([l,v],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",paddingBottom:6,borderBottom:"1px solid var(--bd)"}}>
                    <span style={{fontSize:11,color:"var(--t3)"}}>{l}</span>
                    <span style={{fontSize:11,fontWeight:600,color:"var(--t1)",textAlign:"right",maxWidth:160}}>{v}</span>
                  </div>
                ))}
                <div style={{padding:"10px 0",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"var(--t2)"}}>Monto</span>
                  <span className="mono" style={{fontSize:18,fontWeight:800,color:C.blue}}>{"$"+fi(sel.monto)}</span>
                </div>
                {sel.estado==="cobrada"&&(
                  <div style={{padding:"10px 12px",background:"rgba(29,158,117,.08)",border:"1px solid rgba(29,158,117,.2)",borderRadius:"var(--r)"}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.teal,textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Datos del cobro</div>
                    {[["Fecha cobro",sel.fechaCobro],["N° Voucher",sel.voucher||"—"],["Banco",sel.banco],["Referencia",sel.referencia||"—"]].map(([l,v],i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{color:"var(--t3)"}}>{l}</span><span style={{fontWeight:600,color:"var(--t1)"}}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sel.comprobante&&<div style={{fontSize:11,color:"var(--t3)"}}>{I.file} {sel.comprobante}</div>}
                {sel.estado!=="cobrada"&&canEdit&&(
                  <button className="btn btn-p" style={{width:"100%",justifyContent:"center"}} onClick={()=>setModalCobro(sel.id)}>{I.check} Registrar cobro</button>
                )}
              </div>
            </div>
          ):(
            <div style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)",padding:40,textAlign:"center",color:"var(--t3)"}}>
              <div style={{fontSize:24,marginBottom:8}}>🧾</div>Selecciona una factura
            </div>
          )}
        </div>
      )}

      {/* -- POR CLIENTE -- */}
      {tab==="porCliente"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}}>
          {clientes.map(cliente=>{
            const fCliente = facturas.filter(f=>f.cliente===cliente);
            const cobrado  = fCliente.filter(f=>f.estado==="cobrada").reduce((a,f)=>a+f.monto,0);
            const total    = fCliente.reduce((a,f)=>a+f.monto,0);
            const pct_cob  = pct(cobrado,total);
            return(
              <div key={cliente} className="card">
                <div className="card-hd">
                  <div><div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{cliente}</div><div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{fCliente[0]?.ruc} · {fCliente.length} facturas</div></div>
                  <div className="mono" style={{fontSize:16,fontWeight:800,color:C.blue}}>{"$"+fi(total)}</div>
                </div>
                <div className="cb">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:11,color:"var(--t2)"}}>Cobrado: <strong style={{color:C.teal}}>{"$"+fi(cobrado)}</strong></span>
                    <span style={{fontSize:11,color:"var(--t2)"}}>Pendiente: <strong style={{color:C.amber}}>{"$"+fi(total-cobrado)}</strong></span>
                  </div>
                  <PBar pct={pct_cob} color={pct_cob===100?C.teal:C.amber}/>
                  <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
                    {fCliente.map(f=>{
                      const est=estadoReal(f);
                      return(
                        <div key={f.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",background:"var(--hv)",borderRadius:4}}>
                          <span className={"pill "+EST_COL[est]} style={{fontSize:9,flexShrink:0}}>{est}</span>
                          <span style={{fontSize:11,flex:1,color:"var(--t2)"}}>Cuota {f.cuota}/{f.totalCuotas}</span>
                          <span className="mono" style={{fontSize:11,fontWeight:700}}>{"$"+fi(f.monto)}</span>
                          <span style={{fontSize:10,color:est==="vencida"?C.red:"var(--t3)"}}>{f.vencimiento}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- FLUJO DE CAJA -- */}
      {tab==="flujo"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div className="card">
              <div className="card-hd"><div className="ct">Cobros realizados 2026</div></div>
              <div className="cb">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={clientes.map(c=>({
                    name:c.substring(0,12),
                    cobrado:facturas.filter(f=>f.cliente===c&&f.estado==="cobrada").reduce((a,f)=>a+f.monto,0),
                    pendiente:facturas.filter(f=>f.cliente===c&&f.estado!=="cobrada").reduce((a,f)=>a+f.monto,0),
                  }))} margin={{top:4,right:8,left:-18,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                    <XAxis dataKey="name" tick={{fontSize:9,fill:"var(--t3)"}}/>
                    <YAxis tick={{fontSize:9,fill:"var(--t3)"}}/>
                    <Tooltip content={<CTip pre="$"/>}/>
                    <Bar dataKey="cobrado"   name="Cobrado"   fill={C.teal} radius={[2,2,0,0]}/>
                    <Bar dataKey="pendiente" name="Pendiente" fill={C.amber} opacity={.7} radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><div className="ct">Próximos vencimientos</div></div>
              <div style={{maxHeight:220,overflowY:"auto"}}>
                {facturas.filter(f=>f.estado!=="cobrada").sort((a,b)=>new Date(a.vencimiento.split("/").reverse().join("-"))-new Date(b.vencimiento.split("/").reverse().join("-"))).map(f=>{
                  const est=estadoReal(f);
                  const diasNum=Math.ceil((new Date(f.vencimiento.split("/").reverse().join("-"))-HOY)/(1000*60*60*24));
                  return(
                    <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:"1px solid var(--bd)"}}>
                      <div style={{width:36,height:36,borderRadius:"var(--r)",background:est==="vencida"?"rgba(226,75,74,.1)":"rgba(186,117,23,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:10,fontWeight:800,color:est==="vencida"?C.red:C.amber}}>{est==="vencida"?Math.abs(diasNum)+"d":diasNum+"d"}</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.cliente}</div>
                        <div style={{fontSize:10,color:"var(--t3)"}}>Cuota {f.cuota}/{f.totalCuotas} · Vence {f.vencimiento}</div>
                      </div>
                      <span className="mono" style={{fontSize:13,fontWeight:700,color:est==="vencida"?C.red:C.blue,flexShrink:0}}>{"$"+fi(f.monto)}</span>
                      {canEdit&&<button className="btn btn-g btn-xs" onClick={()=>setModalCobro(f.id)}>{I.check}</button>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// CONTRATACIÓN Y PROPUESTAS
// ==============================================================================
const PROPUESTAS_INIT = [
  {id:"PROP-2026-001",lead:"L006",cliente:"Cía. Minera SIMSA",ruc:"20100177421",
   proyecto:"Inventario y Conciliación del Activo Fijo",division:"Consultoría Activo Fijo",
   version:2,fecha:"18/03/2026",valor:26500,plazo:"9 semanas",margen:24.1,
   estado:"ganado",enviadoEl:"19/03/2026",respondidoEl:"21/03/2026",
   contacto:"Ing. Pedro Vargas",cargo:"Gerente de Finanzas",email:"p.vargas@simsa.com.pe",
   notas:"Propuesta aprobada con ajuste de plazo. Cotización COT-2026-004.",
   alcance:["Inventario físico de activos fijos en planta Morococha","Conciliación contable bajo NIIF 13","Informe final con anexos","9 semanas de ejecución"],
   historial:[{v:1,fecha:"15/03/2026",estado:"propuesta",nota:"Versión inicial"},{v:2,fecha:"18/03/2026",estado:"ganado",nota:"Ajuste de plazo y alcance según feedback del cliente"}]},
  {id:"PROP-2026-002",lead:"L003",cliente:"Tottus / Falabella",ruc:"20100047218",
   proyecto:"Valuación y Conciliación AF — 12 Tiendas Lima",division:"Consultoría Activo Fijo",
   version:1,fecha:"01/04/2026",valor:85000,plazo:"16 semanas",margen:22.0,
   estado:"propuesta",enviadoEl:"01/04/2026",respondidoEl:null,
   contacto:"Dr. Jorge Castro",cargo:"CFO Regional",email:"j.castro@falabella.com.pe",
   notas:"Propuesta enviada. Pendiente revisión por board. Alto valor estratégico.",
   alcance:["Inventario AF en 12 tiendas Lima y provincias","Valuación bajo NIIF 16","Conciliación contable completa","Informe ejecutivo por tienda"],
   historial:[{v:1,fecha:"01/04/2026",estado:"propuesta",nota:"Primera versión enviada al CFO Regional"}]},
  {id:"PROP-2026-003",lead:"L001",cliente:"Grupo Breca",ruc:"20100006780",
   proyecto:"Valuación NIIF 13 — Activos Maquinaria Callao y Lurín",division:"Consultoría Activo Fijo",
   version:1,fecha:"28/03/2026",valor:48000,plazo:"12 semanas",margen:22.0,
   estado:"calificado",enviadoEl:null,respondidoEl:null,
   contacto:"Ing. Carlos Mendoza",cargo:"Gerente AF",email:"c.mendoza@breca.com.pe",
   notas:"En revisión interna antes de enviar. Requiere validación de Gerencia.",
   alcance:["Valuación comercial bajo NIIF 13","Activos en plantas Callao y Lurín","Informe técnico de valuación"],
   historial:[{v:1,fecha:"28/03/2026",estado:"calificado",nota:"Borrador en revisión interna"}]},
  {id:"PROP-2026-004",lead:"L005",cliente:"Ferreyros S.A.",ruc:"20100066469",
   proyecto:"Inventario AF — Sede Central y Sucursales",division:"Consultoría Activo Fijo",
   version:2,fecha:"31/03/2026",valor:28000,plazo:"8 semanas",margen:21.5,
   estado:"negociacion",enviadoEl:"28/03/2026",respondidoEl:"30/03/2026",
   contacto:"Ing. Roberto Silva",cargo:"VP Finanzas",email:"r.silva@ferreyros.com.pe",
   notas:"Cliente solicita descuento del 5% y ampliación de plazo. En negociación legal.",
   alcance:["Inventario sede central Lima","Inventario 3 sucursales provincia","Conciliación contable"],
   historial:[{v:1,fecha:"28/03/2026",estado:"propuesta",nota:"Propuesta inicial"},{v:2,fecha:"31/03/2026",estado:"negociacion",nota:"Ajuste por solicitud de descuento del cliente"}]},
];

function Propuestas({cotizaciones,setCotizaciones,toast,usuario,setProyectos,proyectos}) {
  // Propuestas = cotizaciones con campo 'estado' de propuesta
  // Fuente de verdad: cotizaciones globales (persistidas)
  const props = (cotizaciones||[]).map(c=>({
    ...c,
    // Campos de propuesta que pueden no existir en cotización vieja
    ruc:      c.ruc||"—",
    contacto: c.contacto||"—",
    cargo:    c.cargo||"—",
    email:    c.email||"—",
    division: c.division||"Consultoría Activo Fijo",
    version:  c.version||1,
    plazo:    c.plazo||"A definir",
    alcance:  c.alcance||[c.servicio||"Servicio de consultoría"],
    notas:    c.notas||"",
    historial:c.historial||[{v:1,fecha:c.fecha,estado:c.estado,nota:"Registro inicial"}],
    valor:    c.venta||c.valor||0,
  }));

  const setProps = (updater) => {
    // Sincroniza cambios de vuelta a cotizaciones globales
    if(typeof updater === "function") {
      const updated = updater(props);
      setCotizaciones(prev=>{
        const ids = updated.map(p=>p.id);
        const viejas = (prev||[]).filter(c=>!ids.includes(c.id));
        return [...updated.map(p=>({...p, venta:p.valor})), ...viejas];
      });
    } else {
      setCotizaciones(prev=>{
        const ids = updater.map(p=>p.id);
        const viejas = (prev||[]).filter(c=>!ids.includes(c.id));
        return [...updater.map(p=>({...p, venta:p.valor})), ...viejas];
      });
    }
  };

  const [sel,setSel]        = useState(null);
  const [tab,setTab]        = useState("lista");
  const [filtEst,setFiltEst]= useState("todos");
  const [modalNueva,setModalNueva] = useState(false);
  const [nuevaForm,setNuevaForm]   = useState({cliente:"",ruc:"",contacto:"",cargo:"",email:"",proyecto:"",division:"Consultoría Activo Fijo",valor:"",plazo:"",margen:22,alcance:"",notas:""});
  const canEdit = ["Admin","Comercial","Gerencia"].includes(usuario.rol);
  const [confirmElim, setConfirmElim] = useState(null); // id a eliminar
  const [modalEditar, setModalEditar] = useState(null); // obj propuesta a editar

  const eliminarPropuesta = (id) => {
    setCotizaciones(prev=>(prev||[]).filter(c=>c.id!==id));
    if(sel?.id===id) setSel(null);
    setConfirmElim(null);
    toast("✓ Propuesta eliminada","success");
  };

  const guardarEdicion = () => {
    if(!modalEditar.cliente?.trim()||!modalEditar.proyecto?.trim()){
      toast("Cliente y proyecto son obligatorios","error"); return;
    }
    setCotizaciones(prev=>(prev||[]).map(c=>c.id===modalEditar.id?{
      ...c,
      cliente:  modalEditar.cliente,
      proyecto: modalEditar.proyecto,
      venta:    parseFloat(modalEditar.valor)||c.venta,
      valor:    parseFloat(modalEditar.valor)||c.valor,
      margen:   parseFloat(modalEditar.margen)||c.margen,
      plazo:    modalEditar.plazo||c.plazo,
      contacto: modalEditar.contacto||c.contacto,
      cargo:    modalEditar.cargo||c.cargo,
      email:    modalEditar.email||c.email,
      notas:    modalEditar.notas||c.notas,
      alcance:  (modalEditar.alcanceStr||"").split("\n").filter(l=>l.trim()),
      historial:[{v:(c.version||1)+1,fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),estado:c.estado,nota:"Editada por "+usuario.nombre},...(c.historial||[])],
    }:c));
    if(sel?.id===modalEditar.id) setSel(prev=>({...prev,...modalEditar}));
    setModalEditar(null);
    toast("✓ Propuesta actualizada","success");
  };

  const crearPropuesta = () => {
    if(!nuevaForm.cliente.trim()||!nuevaForm.proyecto.trim()||!nuevaForm.valor){
      toast("Completa cliente, proyecto y valor","error"); return;
    }
    const nueva = {
      id:"COT-2026-0"+String(Date.now()).slice(-3),
      lead:"—",
      cliente:nuevaForm.cliente, ruc:nuevaForm.ruc,
      proyecto:nuevaForm.proyecto, division:nuevaForm.division,
      version:1, fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),
      venta:parseFloat(nuevaForm.valor)||0,
      valor:parseFloat(nuevaForm.valor)||0,
      costo:0, margen:parseFloat(nuevaForm.margen)||22,
      plazo:nuevaForm.plazo||"A definir",
      estado:"calificado",
      autor:usuario.nombre,
      cuotas:4,
      servicio:nuevaForm.proyecto,
      enviadoEl:null, respondidoEl:null,
      contacto:nuevaForm.contacto, cargo:nuevaForm.cargo, email:nuevaForm.email,
      notas:nuevaForm.notas||"Propuesta en elaboración.",
      alcance:nuevaForm.alcance.split("\n").filter(l=>l.trim()),
      historial:[{v:1,fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),estado:"calificado",nota:"Creada por "+usuario.nombre}],
      personal:[],
    };
    setCotizaciones(prev=>[nueva,...(prev||[])]);
    setSel({...nueva});
    setTab("lista");
    toast("✓ Propuesta creada como borrador","success");
    setModalNueva(false);
    setNuevaForm({cliente:"",ruc:"",contacto:"",cargo:"",email:"",proyecto:"",division:"Consultoría Activo Fijo",valor:"",plazo:"",margen:22,alcance:"",notas:""});
  };

  const ESTADOS = {
    prospecto:   {col:"navy",  lbl:"Prospecto"},
    calificado:  {col:"blue",  lbl:"Calificado"},
    propuesta:   {col:"amber", lbl:"Propuesta"},
    negociacion: {col:"purple",lbl:"Negociación"},
    ganado:      {col:"teal",  lbl:"Ganado"},
    rechazada:   {col:"red",   lbl:"Rechazada"},
  };

  const filtradas = filtEst==="todos" ? props : props.filter(p=>p.estado===filtEst);
  const totalAprobado = props.filter(p=>p.estado==="aprobada").reduce((a,p)=>a+p.valor,0);
  const totalEnviado  = props.filter(p=>["enviada","negociacion"].includes(p.estado)).reduce((a,p)=>a+p.valor,0);
  const tasaExito     = props.length>0 ? Math.round(props.filter(p=>p.estado==="aprobada").length/props.filter(p=>p.estado!=="borrador").length*100) : 0;

  const cambiarEstado = (id, nuevoEstado) => {
    setProps(prev=>prev.map(p=>p.id===id?{...p,estado:nuevoEstado,historial:[{v:p.version+1,fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),estado:nuevoEstado,nota:"Estado actualizado por "+usuario.nombre},...p.historial]}:p));
    if(sel&&sel.id===id) setSel(prev=>({...prev,estado:nuevoEstado}));
    // Al aprobar: crear proyecto en Ejecución si no existe
    if(nuevoEstado==="aprobada" && setProyectos) {
      const prop = (cotizaciones||[]).find(c=>c.id===id) || props.find(p=>p.id===id);
      if(prop) {
        const yaExiste = (proyectos||[]).some(p=>p.cotId===id||(p.cliente===prop.cliente&&p.valor===(prop.venta||prop.valor)));
        if(!yaExiste) {
          const valor = prop.venta||prop.valor||0;
          const cuotas = prop.cuotas||4;
          // Detectar tipo de servicio para fases correctas
            const esAF = !(prop.servicio||prop.proyecto||"").toLowerCase().includes("existenc");
            const semsStr = (prop.plazo||"9 semanas").match(/\d+/);
            const semanas = semsStr ? parseInt(semsStr[0]) : 9;
            const hoy = new Date();
            const finDate = new Date(hoy); finDate.setDate(finDate.getDate() + semanas*7);

            // Fases estándar Aquarius según tipo
            const fasesAF = [
              {id:1,nom:"Planeamiento y organización del inventario",avance:0,estado:"en_curso",semI:1,semF:1,
                ents:[{id:1,nom:"Cronograma detallado",est:"pendiente",fecha:"",arch:false},{id:2,nom:"Catálogo AF",est:"pendiente",fecha:"",arch:false},{id:3,nom:"Plan de inventario físico",est:"pendiente",fecha:"",arch:false}]},
              {id:2,nom:"Inventario físico + Control de calidad",avance:0,estado:"propuesta",semI:2,semF:3,
                ents:[{id:4,nom:"Reporte de inventario por tipo de activo",est:"pendiente",fecha:"",arch:false},{id:5,nom:"Reporte por centro de costo",est:"pendiente",fecha:"",arch:false}]},
              {id:3,nom:"Planeamiento y organización contable",avance:0,estado:"propuesta",semI:1,semF:2,
                ents:[{id:6,nom:"Cronograma contable",est:"pendiente",fecha:"",arch:false},{id:7,nom:"Diagnóstico de procedimientos AF",est:"pendiente",fecha:"",arch:false}]},
              {id:4,nom:"Normalización de la base contable",avance:0,estado:"propuesta",semI:2,semF:2,
                ents:[{id:8,nom:"Reporte base contable normalizada",est:"pendiente",fecha:"",arch:false}]},
              {id:5,nom:"Conciliación contable",avance:0,estado:"propuesta",semI:3,semF:3,
                ents:[{id:9,nom:"Reporte activos conciliados",est:"pendiente",fecha:"",arch:false},{id:10,nom:"Reporte activos faltantes y sobrantes",est:"pendiente",fecha:"",arch:false}]},
              {id:6,nom:"Análisis de activos faltantes y sobrantes",avance:0,estado:"propuesta",semI:3,semF:4,
                ents:[{id:11,nom:"Informe de diferencias",est:"pendiente",fecha:"",arch:false}]},
              {id:7,nom:"Elaboración del informe final",avance:0,estado:"propuesta",semI:4,semF:4,
                ents:[{id:12,nom:"Informe final de servicio",est:"pendiente",fecha:"",arch:false},{id:13,nom:"Anexos de entregables",est:"pendiente",fecha:"",arch:false}]},
            ];
            const fasesEX = [
              {id:1,nom:"Planeamiento y organización del inventario",avance:0,estado:"en_curso",semI:1,semF:1,
                ents:[{id:1,nom:"Cronograma detallado",est:"pendiente",fecha:"",arch:false},{id:2,nom:"Plan de inventario",est:"pendiente",fecha:"",arch:false}]},
              {id:2,nom:"Inventario físico de existencias",avance:0,estado:"propuesta",semI:2,semF:3,
                ents:[{id:3,nom:"Reporte de inventario por tipo",est:"pendiente",fecha:"",arch:false}]},
              {id:3,nom:"Control de calidad del inventario",avance:0,estado:"propuesta",semI:3,semF:3,
                ents:[{id:4,nom:"Reporte de control de calidad",est:"pendiente",fecha:"",arch:false}]},
              {id:4,nom:"Análisis de faltantes y sobrantes",avance:0,estado:"propuesta",semI:3,semF:4,
                ents:[{id:5,nom:"Informe de diferencias",est:"pendiente",fecha:"",arch:false}]},
              {id:5,nom:"Elaboración del informe final",avance:0,estado:"propuesta",semI:4,semF:4,
                ents:[{id:6,nom:"Informe final de servicio",est:"pendiente",fecha:"",arch:false}]},
            ];

            // Cobros con fechas calculadas (cada 30 días aprox)
            const cobrosCalc = Array.from({length:cuotas},(_,i)=>{
              const d = new Date(hoy); d.setDate(d.getDate() + Math.round((i+1)*(semanas*7/cuotas)));
              return {
                n:i+1,
                monto:Math.round(valor/cuotas),
                fecha:d.toISOString().split("T")[0],
                estado:i===0?"pendiente":"pendiente",
                concepto:(prop.proyecto||prop.cliente)+" — Cuota "+(i+1)+"/"+cuotas,
              };
            });

            const nP = {
              id:"PRY-"+id.replace("COT-",""),
              cotId:id,
              ruc:prop.ruc||"—",
              cliente:prop.cliente,
              proyecto:prop.proyecto||prop.servicio||"Proyecto "+prop.cliente,
              servicio:prop.servicio||prop.proyecto||"Consultoría Activo Fijo",
              division:prop.division||"Consultoría Activo Fijo",
              valor,
              costo:prop.costo||0,
              margen:prop.margen||0,
              avance:0,
              fase:"Fase 1 — Planeamiento",
              faseActual:1,
              estado:"iniciando",
              inicio:hoy.toISOString().split("T")[0],
              fin:finDate.toISOString().split("T")[0],
              plazo:semanas+" semanas",
              jefe:usuario?.nombre||"Wilmer Moreno V.",
              cobrado:0,
              pendiente:valor,
              horasCot:prop.personal?.reduce((a,p)=>a+(p.cant||1)*(p.horas||0),0)||0,
              activosPresupuestados:prop.activosPresupuestados||0,
              costoUnitAdicional:prop.costoUnitAdicional||2.00,
              horasReal:0,
              personal:prop.personal||[],
              cobros:cobrosCalc,
              fases:esAF?fasesAF:fasesEX,
              documentos:[],
              contacto:prop.contacto||"—",
              email:prop.email||"—",
              cargo:prop.cargo||"—",
            };
          setProyectos(prev=>[nP,...(prev||[])]);
          toast("✓ Propuesta aprobada — Proyecto creado en Ejecución","success");
          return;
        }
      }
    }
    toast("✓ Estado actualizado a: "+ESTADOS[nuevoEstado]?.lbl,"success");
  };

  const generarPDF = (p) => {
    // Tabla de alcance
    const tabAlcance = p.alcance?.length > 0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px;text-align:left">#</th><th style="padding:7px 10px;text-align:left">Entregable / Alcance</th></tr>'+
        p.alcance.map((a,i)=>'<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:700;color:#4a9fd4;width:30px">'+(i+1)+'</td><td style="padding:6px 10px">'+a+'</td></tr>').join('')+
        '</table>'
      : '<div style="color:#94a3b8;font-size:11px;padding:8px">Sin alcance definido</div>';
    // Info del cliente
    const infoCliente = '<table style="width:100%;border-collapse:collapse;font-size:11px">'+
      [["Empresa",p.cliente],["RUC",p.ruc||"—"],["Contacto",p.contacto+" — "+p.cargo],["Email",p.email||"—"],["División",p.division||"—"],["Plazo",p.plazo||"—"]].map(([k,v],i)=>
        '<tr style="background:'+(i%2?'#f8fafc':'#fff')+'"><td style="padding:6px 10px;font-weight:600;color:#64748b;width:150px">'+k+'</td><td style="padding:6px 10px;font-weight:500">'+v+'</td></tr>'
      ).join('')+'</table>';
    // Semáforo de margen
    const mgColor = (p.margen||0)>=30?'#1D9E75':(p.margen||0)>=22?'#BA7517':'#E24B4A';
    const mgLabel = (p.margen||0)>=30?'Excelente':(p.margen||0)>=22?'Aceptable':'Revisar';
    const semaforo = '<div style="display:flex;align-items:center;gap:16px;padding:12px;background:#f8fafc;border-radius:8px">'+
      '<div style="width:48px;height:48px;border-radius:50%;background:'+mgColor+';display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff">'+f1(p.margen||0)+'%</div>'+
      '<div><div style="font-size:13px;font-weight:700;color:'+mgColor+'">'+((p.margen||0)>=30?'Margen excelente':(p.margen||0)>=22?'Margen aceptable':'Margen bajo')+'</div>'+
      '<div style="font-size:11px;color:#64748b">Objetivo ISO 9001: 30% · Mínimo: 22%</div></div>'+
      '<div style="margin-left:auto;text-align:right"><div style="font-size:22px;font-weight:900;color:#1a2e4a;font-family:monospace">$'+fi(p.valor||0)+'</div><div style="font-size:10px;color:#64748b">USD + IGV</div></div></div>';
    generarPDFRico({
      nombre: "Propuesta_"+p.id.replace(/-/g,"_"),
      titulo: "Propuesta Comercial N° "+p.id,
      subtitulo: (p.cliente||"—")+" · v"+p.version+" · "+p.fecha,
      kpis:[
        {label:"Inversión total",  value:"$"+fi(p.valor||0),            color:"#1a2e4a"},
        {label:"Margen estimado",  value:f1(p.margen||0)+"%",           color:mgColor},
        {label:"Versión",          value:"v"+p.version,                  color:"#4a9fd4"},
        {label:"Estado",           value:(p.estado||"").toUpperCase(),   color:"#BA7517"},
        {label:"Plazo",            value:p.plazo||"A definir",           color:"#1D9E75"},
      ],
      secciones:[
        {titulo:"Datos del Cliente",           contenido:infoCliente},
        {titulo:"Valor Económico y Rentabilidad", contenido:semaforo},
        {titulo:"Alcance del Servicio",        contenido:tabAlcance},
        {titulo:"Notas y Condiciones",         contenido:'<div style="background:#f0f9ff;border-left:4px solid #4a9fd4;padding:12px 16px;border-radius:0 8px 8px 0;font-size:11px;line-height:1.8;color:#1e293b">'+(p.notas||"Sin notas adicionales.")+'</div>'},
      ],
      analisis:{
        situacion:"Propuesta <strong>"+p.id+"</strong> para <strong>"+(p.cliente||"—")+"</strong>. Inversión: <strong>USD "+fi(p.valor||0)+"</strong>. Margen estimado: <strong>"+f1(p.margen||0)+"%</strong>. Estado actual: <strong>"+(p.estado||"—")+"</strong>.",
        logros: (p.margen||0)>=30?"Margen superior al objetivo ISO 9001 (30%). Propuesta muy rentable.":undefined,
        riesgos: (p.margen||0)<22?"Margen inferior al mínimo aceptable (22%). Revisar estructura de costos antes de enviar.":undefined,
        recomendaciones:"<strong>1.</strong> Presentar la propuesta al contacto designado en las próximas 48h.<br/><strong>2.</strong> Hacer seguimiento telefónico 3 días después del envío.<br/><strong>3.</strong> Si no hay respuesta en 7 días, escalar al gerente del cliente.<br/><strong>4.</strong> Actualizar el estado en el CRM después de cada interacción.",
      }
    });
    toast("✓ Propuesta PDF descargada","success");
  };

  const generarMemo = (p, tipo) => {
    try {
    const fecha = new Date().toLocaleDateString("es-PE",{day:"numeric",month:"long",year:"numeric"});
    const nroMemo = "001-"+new Date().getFullYear();
    const esAF = tipo==="AF";

    // -- Buscar personal de cotización vinculada -------------------
    const allCots = [...(cotizaciones||[]), ...COTS_DEFAULT];
    const findCot = (arr) => arr.find(c=>
      c.cliente===p.cliente ||
      (p.lead && c.leadId===p.lead) ||
      c.cliente.toLowerCase().includes((p.cliente||"").toLowerCase().split(" ")[0]) ||
      (p.cliente||"").toLowerCase().includes(c.cliente.toLowerCase().split(" ")[0])
    );
    const cotConPersonal = findCot(allCots.filter(c=>c.personal?.length>0));
    const personalMemo = (cotConPersonal||findCot(allCots))?.personal||p.personal||[];

    // -- Organigrama SVG dinámico ----------------------------------
    const mkOrgSVG = (jefeNom, pers) => {
      const has  = (keys) => pers.some(pe=>pe&&pe.cargo&&keys.some(k=>(pe.cargo||"").toLowerCase().includes(k.toLowerCase())));
      const find2= (keys) => pers.find(pe=>pe&&pe.cargo&&keys.some(k=>(pe.cargo||"").toLowerCase().includes(k.toLowerCase())));
      const findAll=(keys)=> pers.filter(pe=>pe&&pe.cargo&&keys.some(k=>(pe.cargo||"").toLowerCase().includes(k.toLowerCase())));
      const hLbl = (pe)=>pe?`${pe.horas||pe.cot||""}h`:"";
      const cntLbl=(pe)=>pe&&pe.cant&&pe.cant>1?` ×${pe.cant}`:"";
      const coordSIG  = has(["coord","sig"]);
      const jefeTI    = has(["jefe ti","sistemas","tecnolog"]);
      const perito    = find2(["perito","valuador senior","valuador"]);
      const cFuncional= find2(["senior","funcional","consultor"]);
      const cContable = find2(["consultor conta","contador consul"]);
      const supervisor= find2(["supervisor","supervis"]);
      const topografo = find2(["topógra","topogra"]);
      const aContable = find2(["asistente contable","asist contab"]);
      const aInv      = findAll(["asistente mina","asistente inv","asist mina","asistente de inv"]);
      const nAsist    = aInv.reduce((a,pe)=>a+(pe.cant||1),0);
      const nW=130,nH=38,gY=50,gX=20;
      const n2=(cFuncional?1:0)+(cContable?1:0);
      const W=Math.max(600,n2*nW+(n2+1)*gX+200),cx1=W/2;
      const col2xs=[];
      if(n2===2){col2xs.push(W*0.29);col2xs.push(W*0.71);}else if(n2===1){col2xs.push(W/2);}
      const cy1=14,cy2=cy1+nH+gY,cy3=cy2+(n2>0?nH+gY:0),cy4=cy3+(((supervisor||topografo)||aContable)?nH+gY:0);
      const H=(nAsist>0?cy4+nH:((supervisor||topografo)||aContable)?cy3+nH:n2>0?cy2+nH:cy1+nH)+20;
      const box=(x,cy,fill,stroke,label,sub)=>{
        const lx=x-nW/2,tc=fill==="#f1f5f9"||fill==="#e8edf2"?"#334155":"#fff",sc=fill==="#f1f5f9"||fill==="#e8edf2"?"#64748b":"rgba(255,255,255,0.6)";
        const lbl=(label||"").length>18?(label||"").substring(0,17)+"…":(label||"");
        return`<rect x="${lx}" y="${cy}" width="${nW}" height="${nH}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
          +`<text x="${x}" y="${cy+(sub?15:nH/2+4)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="${tc}">${lbl}</text>`
          +(sub?`<text x="${x}" y="${cy+29}" text-anchor="middle" font-size="8" fill="${sc}">${sub}</text>`:"");
      };
      const ln =(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a9fd4" stroke-width="1.5"/>`;
      const dsh=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,3"/>`;
      let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="font-family:Segoe UI,sans-serif;background:#f8fafc;border-radius:8px">`;
      if(coordSIG){s+=box(cx1-nW*1.6,cy1,"#e8edf2","#94a3b8","Coord. SIG","externo");s+=dsh(cx1-nW*1.6+nW/2,cy1+nH/2,cx1-nW/2,cy1+nH/2);}
      if(jefeTI)  {s+=box(cx1+nW*1.6,cy1,"#e8edf2","#94a3b8","Jefe de TI","externo");s+=dsh(cx1+nW/2,cy1+nH/2,cx1+nW*1.6-nW/2,cy1+nH/2);}
      if(perito){const px=cx1+nW*1.2;s+=box(px,cy1-nH/2,"#1E293B","#4a9fd4",(perito.cargo||"").length>18?(perito.cargo||"").substring(0,17)+"…":(perito.cargo||""),hLbl(perito)+cntLbl(perito));s+=dsh(cx1+nW/2,cy1+nH/4,px-nW/2,cy1);}
      s+=box(cx1,cy1,"#1E293B","#1E293B","Jefe de Proyecto",(jefeNom||"").split(" ").slice(0,3).join(" "));
      if(n2>0){
        const midY12=cy1+nH+gY*0.4;
        s+=ln(cx1,cy1+nH,cx1,midY12);
        if(n2>1){s+=ln(col2xs[0],midY12,col2xs[n2-1],midY12);}
        col2xs.forEach((cx2,i)=>{
          s+=ln(cx2,midY12,cx2,cy2);
          const node=i===0?cFuncional:cContable;
          if(!node)return;
          s+=box(cx2,cy2,"#2a4a7f","#2a4a7f",(node.cargo||"").length>18?(node.cargo||"").substring(0,17)+"…":(node.cargo||""),hLbl(node)+cntLbl(node));
        });
      }
      if((supervisor||topografo)&&col2xs[0]){
        const cx3L=col2xs[0],midY23=cy2+nH+gY*0.4;
        s+=ln(cx3L,cy2+nH,cx3L,midY23);
        const n3nodes=[supervisor,topografo].filter(Boolean);
        const n3w=n3nodes.length*(nW+gX)-gX,n3start=cx3L-n3w/2+nW/2;
        if(n3nodes.length>1){s+=ln(n3start,midY23,n3start+(n3nodes.length-1)*(nW+gX),midY23);}
        n3nodes.forEach((nd,i)=>{
          const x3=n3start+i*(nW+gX);
          s+=ln(x3,midY23,x3,cy3);
          s+=box(x3,cy3,"#4a9fd4","#4a9fd4",(nd.cargo||"").length>18?(nd.cargo||"").substring(0,17)+"…":(nd.cargo||""),hLbl(nd)+cntLbl(nd));
        });
        if(nAsist>0){
          const supX=n3start,midY34=cy3+nH+gY*0.4;
          s+=ln(supX,cy3+nH,supX,midY34);s+=ln(supX,midY34,supX,cy4);
          const aLabel=(aInv[0]&&aInv[0].cargo||"Asistentes").length>18?(aInv[0]&&aInv[0].cargo||"Asistentes").substring(0,17)+"…":(aInv[0]&&aInv[0].cargo||"Asistentes");
          s+=box(supX,cy4,"#6da8d4","#4a9fd4",aLabel,`${nAsist} persona${nAsist>1?"s":""}`);
        }
      }
      if(aContable&&col2xs[1]){s+=ln(col2xs[1],cy2+nH,col2xs[1],cy3);s+=box(col2xs[1],cy3,"#f1f5f9","#94a3b8","Asist. Contable",hLbl(aContable)+cntLbl(aContable));}
      s+=`</svg>`;
      return s;
    };
    const orgSVG = mkOrgSVG(p.jefe||"Wilmer Moreno V.", personalMemo);

    // -- Tabla de personal -----------------------------------------
    const tabPersonalMemo = personalMemo.length>0
      ? '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">Cargo</th><th style="padding:7px;text-align:right">H. cotizadas</th><th style="padding:7px;text-align:right">Costo USD</th></tr>'
        + personalMemo.map((pe,i)=>'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:6px 10px">'+pe.cargo+'</td><td style="padding:6px;text-align:right;font-family:monospace">'+(pe.cot||pe.horas||"—")+'h</td><td style="padding:6px;text-align:right;font-family:monospace">$'+(pe.costoCot?fi(pe.costoCot):"—")+'</td></tr>').join('')
        +'</table>'
      : '<p style="color:#94a3b8;font-size:12px;padding:10px">Personal por confirmar</p>';

    // -- Gantt SVG de fases ----------------------------------------
    const fasesGantt = esAF ? [
      {n:"Planeamiento y organización del inventario",s:1,e:1},
      {n:"Inventario físico + Control de calidad",    s:2,e:3},
      {n:"Planeamiento y organización contable",      s:1,e:2},
      {n:"Normalización de la base contable",         s:2,e:2},
      {n:"Conciliación contable",                     s:3,e:3},
      {n:"Análisis de faltantes y sobrantes",         s:3,e:4},
      {n:"Elaboración del informe final",             s:4,e:4},
    ] : [
      {n:"Planeamiento y organización del inventario",s:1,e:1},
      {n:"Inventario físico de existencias",          s:2,e:3},
      {n:"Control de calidad del inventario",         s:3,e:3},
      {n:"Análisis de faltantes y sobrantes",         s:3,e:4},
      {n:"Elaboración del informe final",             s:4,e:4},
    ];
    const totalSem=parseInt(p.plazo)||9, semCols=Math.max(totalSem,6);
    const rowH=26,hdrH=28,padL=220,barW=42,svgW=padL+semCols*barW+10;
    let ganttSVG=`<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${hdrH+fasesGantt.length*rowH+10}" style="font-family:Segoe UI,sans-serif">`;
    ganttSVG+=`<rect width="${svgW}" height="${hdrH+fasesGantt.length*rowH+10}" fill="#f8fafc" rx="6"/>`;
    for(let s=1;s<=semCols;s++){const x=padL+(s-1)*barW;ganttSVG+=`<rect x="${x}" y="0" width="${barW}" height="${hdrH}" fill="${s%2===0?"#1E293B":"#243d5c"}"/><text x="${x+barW/2}" y="${hdrH/2+5}" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">S${s}</text>`;}
    fasesGantt.forEach((f,i)=>{
      const y=hdrH+i*rowH,bg=i%2===0?"#fff":"#f1f5f9";
      ganttSVG+=`<rect x="0" y="${y}" width="${svgW}" height="${rowH}" fill="${bg}"/>`;
      ganttSVG+=`<text x="8" y="${y+rowH/2+4}" fill="#1E293B" font-size="9" font-weight="600">${i+1}. ${f.n}</text>`;
      const bx=padL+(f.s-1)*barW+3,bw=(f.e-f.s+1)*barW-6;
      ganttSVG+=`<rect x="${bx}" y="${y+5}" width="${bw}" height="${rowH-10}" fill="#4a9fd4" rx="3"/>`;
    });
    ganttSVG+=`</svg>`;

    // -- Recursos Aquarius -----------------------------------------
    const recursosAquarius = esAF ? [
      ["Laptops","2 unidades"],["Pocket PC","4 unidades"],["Sistema SITIA","1 instalación"],
      ["SCTR salud y pensión","Todo el personal"],["EPP básico","Casco, chaleco, zapatos"],
      ["Suministros de inventario","Tableros, lapiceros, wincha, etc."],
    ] : [
      ["Laptops","2 unidades"],["Balanzas","2 unidades"],["Winchas","4 unidades"],
      ["SCTR salud y pensión","Todo el personal"],["EPP básico","Casco, chaleco, zapatos"],
    ];
    const tabRecursos='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">Recurso</th><th style="padding:7px">Cantidad / Detalle</th></tr>'
      +recursosAquarius.map(([r,d],i)=>'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'"><td style="padding:6px 10px;font-weight:600">'+r+'</td><td style="padding:6px 10px;color:#64748b">'+d+'</td></tr>').join('')
      +'</table>';

    // -- Matriz de comunicación ------------------------------------
    const tabMatriz='<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#0F766E;color:#fff"><th style="padding:7px 10px">Parte</th><th style="padding:7px">Cargo</th><th style="padding:7px">Nombre</th><th style="padding:7px">Correo</th></tr>'
      +'<tr style="background:#fff"><td style="padding:6px 10px;font-weight:700;color:#4a9fd4">Cliente</td><td style="padding:6px 10px">'+p.cargo+'</td><td style="padding:6px 10px">'+p.contacto+'</td><td style="padding:6px 10px;font-size:10px">'+p.email+'</td></tr>'
      +'<tr style="background:#f1f5f9"><td style="padding:6px 10px;font-weight:700;color:#1D9E75" rowspan="2">Aquarius</td><td style="padding:6px 10px">Jefe de Proyecto</td><td style="padding:6px 10px">Wilmer Moreno V.</td><td style="padding:6px 10px;font-size:10px">wilmer@nexova.pe</td></tr>'
      +'<tr style="background:#f8fafc"><td style="padding:6px 10px">Gerente General</td><td style="padding:6px 10px">José Luis Silva</td><td style="padding:6px 10px;font-size:10px">jlsilva@aquariusconsulting.com.pe</td></tr>'
      +'</table>';

    const nombre="Memorandum_Inicio_"+(esAF?"AF":"Existencias")+"_"+p.cliente.replace(/[^a-zA-Z0-9]/g,"_")+"_"+p.id.replace(/-/g,"_");
    generarPDFRico({
      nombre,
      titulo:"Memorándum de Inicio de Proyecto",
      subtitulo:"SIG-PR-04-FO-02 · "+(esAF?"Inventario y Conciliación AF":"Inventario de Existencias")+" · "+nroMemo,
      kpis:[
        {label:"Cliente",   value:(p.cliente||"").substring(0,22),    color:"#1E293B"},
        {label:"RUC",       value:p.ruc||"—",                   color:"#64748b"},
        {label:"Proyecto",  value:(p.proyecto||"").substring(0,22),   color:"#4a9fd4"},
        {label:"Valor USD", value:"$"+fi(p.valor),              color:"#1D9E75"},
        {label:"Plazo",     value:p.plazo,                      color:"#BA7517"},
        {label:"Inicio",    value:p.inicio||fecha,              color:"#64748b"},
        {label:"Tipo",      value:esAF?"Activo Fijo":"Existencias",color:esAF?"#1E293B":"#4a9fd4"},
        {label:"Jefe Proy.",value:"Wilmer Moreno V.",            color:"#1E293B"},
      ],
      secciones:[
        {titulo:"Cronograma general de actividades",              contenido:ganttSVG},
        {titulo:"Organigrama del equipo de proyecto",             contenido:orgSVG},
        {titulo:"Personal del proyecto",    contenido:tabPersonalMemo},
        {titulo:"Recursos que proveerá NEXOVA",      contenido:tabRecursos},
        {titulo:"Matriz de comunicación",                         contenido:tabMatriz},
        {titulo:"Información requerida al cliente",               contenido:
          esAF
          ? '<ul style="font-size:11px;line-height:2;color:#1e293b;padding-left:18px"><li>Logo de la empresa (300 dpi)</li><li>Base contable del activo fijo (Excel, a la fecha de corte)</li><li>Planos de locales por áreas y centros de costo</li><li>Listado del personal responsable de activos</li><li>Relación de centros de costo</li><li>Activos en poder de terceros / de terceros en poder de la empresa</li><li>Políticas de activo fijo y bienes menores</li><li>Directorio de anexos del personal vinculado al proyecto</li></ul>'
          : '<ul style="font-size:11px;line-height:2;color:#1e293b;padding-left:18px"><li>Requisitos de ingreso al almacén</li><li>Responsables y personal de contacto en almacén</li><li>Dirección actualizada del almacén</li><li>Horarios disponibles para el inventario</li><li>Inducción de seguridad (si se requiere)</li><li>Estación de trabajo para el consultor</li><li>Balanzas y winchas para pesaje y medición</li></ul>'
        },
      ],
      analisis:{
        situacion:"Memorándum de inicio para el servicio de <strong>"+(esAF?"inventario y conciliación contable del activo fijo":"inventario y conciliación de existencias")+"</strong> en <strong>"+p.cliente+"</strong>. Valor: <strong>USD "+fi(p.valor)+"</strong>. Plazo: <strong>"+p.plazo+"</strong>.",
        recomendaciones:"<strong>1.</strong> Enviar este memorándum al cliente con 5 días de anticipación.<br/><strong>2.</strong> Confirmar recepción de información requerida antes de movilizarse.<br/><strong>3.</strong> Coordinar inducción de seguridad y accesos con 3 días de anticipación."
      }
    });
    toast("✓ Memorándum de inicio ("+(esAF?"Activo Fijo":"Existencias")+") generado","success");
    } catch(err){ console.error("generarMemo error:",err); toast("Error al generar memorándum: "+err.message,"error"); }
  };

  return(
    <div>
      {/* Modal confirmar eliminar */}
      {confirmElim&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget)setConfirmElim(null);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:400,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>🗑 Eliminar propuesta</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:20,lineHeight:1.6}}>
              ¿Eliminar <strong>{props.find(p=>p.id===confirmElim)?.cliente}</strong>?
              <br/><span style={{fontSize:11,color:"var(--red)"}}>Esta acción no se puede deshacer.</span>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-s btn-sm" onClick={()=>setConfirmElim(null)}>Cancelar</button>
              <button className="btn btn-r btn-sm" onClick={()=>eliminarPropuesta(confirmElim)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar propuesta */}
      {modalEditar&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}}
          onClick={e=>{if(e.target===e.currentTarget)setModalEditar(null);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>✏️ Editar propuesta</div><div style={{fontSize:11,color:"var(--t3)"}}>{modalEditar.id}</div></div>
              <button onClick={()=>setModalEditar(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label className="fl">Cliente *</label>
                <input value={modalEditar.cliente||""} onChange={e=>setModalEditar(p=>({...p,cliente:e.target.value}))}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label className="fl">Proyecto / Servicio *</label>
                <input value={modalEditar.proyecto||""} onChange={e=>setModalEditar(p=>({...p,proyecto:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Valor USD</label>
                <input type="number" value={modalEditar.valor||modalEditar.venta||""} onChange={e=>setModalEditar(p=>({...p,valor:e.target.value,venta:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Margen %</label>
                <input type="number" value={modalEditar.margen||""} onChange={e=>setModalEditar(p=>({...p,margen:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Plazo</label>
                <input value={modalEditar.plazo||""} onChange={e=>setModalEditar(p=>({...p,plazo:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Contacto</label>
                <input value={modalEditar.contacto||""} onChange={e=>setModalEditar(p=>({...p,contacto:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Cargo</label>
                <input value={modalEditar.cargo||""} onChange={e=>setModalEditar(p=>({...p,cargo:e.target.value}))}/>
              </div>
              <div>
                <label className="fl">Email</label>
                <input value={modalEditar.email||""} onChange={e=>setModalEditar(p=>({...p,email:e.target.value}))}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label className="fl">Notas</label>
                <textarea rows={2} value={modalEditar.notas||""} onChange={e=>setModalEditar(p=>({...p,notas:e.target.value}))}/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label className="fl">Alcance del servicio (una línea por ítem)</label>
                <textarea rows={3} value={modalEditar.alcanceStr||""} onChange={e=>setModalEditar(p=>({...p,alcanceStr:e.target.value}))}/>
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--bd)",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-s btn-sm" onClick={()=>setModalEditar(null)}>Cancelar</button>
              <button className="btn btn-p btn-sm" onClick={guardarEdicion}>{I.check} Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva propuesta */}
      {modalNueva&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalNueva(false);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:560,maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:14,fontWeight:700}}>Nueva Propuesta Comercial</div>
              <button onClick={()=>setModalNueva(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5}}>Datos del cliente</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label className="fl">Empresa / Cliente *</label><input value={nuevaForm.cliente} onChange={e=>setNuevaForm(f=>({...f,cliente:e.target.value}))} placeholder="Nombre de la empresa"/></div>
                <div><label className="fl">RUC</label><input value={nuevaForm.ruc} onChange={e=>setNuevaForm(f=>({...f,ruc:e.target.value}))} placeholder="20XXXXXXXXX"/></div>
                <div><label className="fl">Contacto</label><input value={nuevaForm.contacto} onChange={e=>setNuevaForm(f=>({...f,contacto:e.target.value}))} placeholder="Nombres y apellidos"/></div>
                <div><label className="fl">Cargo</label><input value={nuevaForm.cargo} onChange={e=>setNuevaForm(f=>({...f,cargo:e.target.value}))} placeholder="Gerente de Finanzas"/></div>
                <div style={{gridColumn:"1/-1"}}><label className="fl">Email</label><input value={nuevaForm.email} onChange={e=>setNuevaForm(f=>({...f,email:e.target.value}))} placeholder="contacto@empresa.com.pe" type="email"/></div>
              </div>
              <div style={{fontSize:11,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginTop:4}}>Datos del servicio</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{gridColumn:"1/-1"}}><label className="fl">Nombre del proyecto *</label><input value={nuevaForm.proyecto} onChange={e=>setNuevaForm(f=>({...f,proyecto:e.target.value}))} placeholder="Ej: Inventario y Conciliación AF — Sede Lima"/></div>
                <div><label className="fl">División</label>
                  <select value={nuevaForm.division} onChange={e=>setNuevaForm(f=>({...f,division:e.target.value}))}>
                    {SERVICIOS_AQUARIUS.map(s=><option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                  </select>
                </div>
                <div><label className="fl">Plazo estimado</label><input value={nuevaForm.plazo} onChange={e=>setNuevaForm(f=>({...f,plazo:e.target.value}))} placeholder="8 semanas"/></div>
                <div><label className="fl">Valor USD *</label><input type="number" value={nuevaForm.valor} onChange={e=>setNuevaForm(f=>({...f,valor:e.target.value}))} placeholder="25000"/></div>
                <div>
                  <label className="fl">Margen objetivo: <strong style={{color:margenColor(nuevaForm.margen)}}>{nuevaForm.margen}%</strong></label>
                  <input type="range" min="10" max="40" step="0.5" value={nuevaForm.margen} onChange={e=>setNuevaForm(f=>({...f,margen:parseFloat(e.target.value)}))} style={{width:"100%",marginTop:6,accentColor:C.blue}}/>
                </div>
              </div>
              <div><label className="fl">Alcance del servicio (una línea por ítem)</label><textarea value={nuevaForm.alcance} onChange={e=>setNuevaForm(f=>({...f,alcance:e.target.value}))} rows={4} style={{resize:"vertical"}} placeholder={"Inventario físico de activos fijos\nConciliación contable bajo NIIF 13\nInforme final con anexos"}/></div>
              <div><label className="fl">Notas internas</label><textarea value={nuevaForm.notas} onChange={e=>setNuevaForm(f=>({...f,notas:e.target.value}))} rows={2} style={{resize:"vertical"}} placeholder="Observaciones, condiciones especiales…"/></div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:4}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalNueva(false)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={crearPropuesta}>{I.check} Crear propuesta</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Contratación y Propuestas</div><div className="ss">{props.length} propuestas · Tasa de éxito: {tasaExito}%</div></div>
        {canEdit&&<button className="btn btn-p btn-sm" id="btn-nueva-cot" data-tour="btn-nueva-cot" onClick={()=>setModalNueva(true)}>{I.plus} Nueva propuesta</button>}
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Total propuestas",  v:props.length,                                                  col:"blue"},
          {l:"Aprobadas",        v:props.filter(p=>p.estado==="aprobada").length,                  col:"teal"},
          {l:"En negociación",   v:props.filter(p=>["enviada","negociacion"].includes(p.estado)).length, col:"amber"},
          {l:"Valor aprobado",   v:"$"+fi(totalAprobado),                                          col:"teal"},
          {l:"Valor en pipeline",v:"$"+fi(totalEnviado),                                           col:"blue"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      <Tabs tabs={[{id:"lista",lbl:"Lista de propuestas"},{id:"pipeline",lbl:"Pipeline de propuestas"},{id:"estadisticas",lbl:"Estadísticas"}]} active={tab} onChange={setTab}/>

      {/* -- LISTA -- */}
      {tab==="lista"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:14,alignItems:"start"}}>
          <div className="card">
            <div className="card-hd">
              <div className="ct">Propuestas</div>
              <div style={{display:"flex",gap:6}}>
                {["todos","borrador","enviada","negociacion","aprobada","rechazada"].map(e=>(
                  <button key={e} onClick={()=>setFiltEst(e)}
                    style={{padding:"2px 8px",fontSize:10,fontWeight:600,borderRadius:10,border:"none",cursor:"pointer",
                      background:filtEst===e?(ESTADOS[e]?.col==="teal"?C.teal:ESTADOS[e]?.col==="blue"?C.blue:ESTADOS[e]?.col==="amber"?C.amber:ESTADOS[e]?.col==="red"?C.red:C.navy):"var(--hv)",
                      color:filtEst===e?"#fff":"var(--t2)"}}>
                    {e==="todos"?"Todas":ESTADOS[e]?.lbl||e}
                  </button>
                ))}
              </div>
            </div>
            {filtradas.map(p=>(
              <div key={p.id} onClick={()=>setSel(p)}
                style={{display:"flex",alignItems:"center",padding:"13px 16px",borderBottom:"1px solid var(--bd)",cursor:"pointer",
                  background:sel&&sel.id===p.id?"rgba(74,159,212,.06)":"transparent",
                  borderLeft:sel&&sel.id===p.id?"3px solid "+C.blue:"3px solid transparent",transition:"background .1s"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{p.id}</span>
                    <span className={"pill "+ESTADOS[p.estado]?.col}>{ESTADOS[p.estado]?.lbl}</span>
                    <span style={{fontSize:10,color:"var(--t3)"}}>v{p.version}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--t1)",marginBottom:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.cliente}</div>
                  <div style={{fontSize:11,color:"var(--t3)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.proyecto}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div className="mono" style={{fontSize:15,fontWeight:800,color:C.blue}}>{"$"+fi(p.valor)}</div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{p.fecha}</div>
                  <div style={{fontSize:10,color:margenColor(p.margen),fontWeight:700}}>{p.margen}% mg</div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle */}
          {sel?(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="card">
                <div className="card-hd">
                  <div>
                    <div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:2}}>{sel.id} · v{sel.version}</div>
                    <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>{sel.cliente}</div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>{sel.contacto} · {sel.cargo}</div>
                  </div>
                  <span className={"pill "+ESTADOS[sel.estado]?.col}>{ESTADOS[sel.estado]?.lbl}</span>
                </div>
                <div className="cb" style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[["Proyecto",sel.proyecto],["División",sel.division],["Plazo",sel.plazo],["Fecha",sel.fecha],["Enviada",sel.enviadoEl||"—"],["Respondida",sel.respondidoEl||"Pendiente"]].map(([l,v],i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",paddingBottom:6,borderBottom:"1px solid var(--bd)"}}>
                      <span style={{fontSize:11,color:"var(--t3)"}}>{l}</span>
                      <span style={{fontSize:11,fontWeight:600,color:"var(--t1)",textAlign:"right",maxWidth:180}}>{v}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
                    <span style={{fontSize:13}}>Valor total</span>
                    <span className="mono" style={{fontSize:18,fontWeight:800,color:C.blue}}>{"$"+fi(sel.valor)}</span>
                  </div>
                  <div style={{marginTop:4,padding:"8px 12px",background:"var(--hv)",borderRadius:"var(--r)"}}>
                    <div style={{fontSize:10,color:"var(--t3)",marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>Alcance del servicio</div>
                    {sel.alcance.map((a,i)=>(
                      <div key={i} style={{display:"flex",gap:6,marginBottom:4,fontSize:11}}>
                        <span style={{color:C.blue,flexShrink:0,fontWeight:700}}>{i+1}.</span>
                        <span style={{color:"var(--t2)"}}>{a}</span>
                      </div>
                    ))}
                  </div>
                  {sel.notas&&<div style={{fontSize:11,color:"var(--t2)",fontStyle:"italic",padding:"6px 0"}}>"{sel.notas}"</div>}
                </div>

                {/* Acciones */}
                {canEdit&&(
                  <div style={{padding:"12px 16px",borderTop:"1px solid var(--bd)",display:"flex",flexWrap:"wrap",gap:6}}>
                    {sel.estado==="borrador"&&<button className="btn btn-p btn-sm" onClick={()=>cambiarEstado(sel.id,"enviada")}>{I.mail} Marcar enviada</button>}
                    {sel.estado==="enviada"&&<button className="btn btn-p btn-sm" onClick={()=>cambiarEstado(sel.id,"negociacion")}>{I.zap} En negociación</button>}
                    {["enviada","negociacion"].includes(sel.estado)&&(
                      <>
                        <button className="btn btn-g btn-sm" id="btn-aprobar-prop" data-tour="btn-aprobar-prop" onClick={()=>cambiarEstado(sel.id,"aprobada")}>{I.check} Aprobar</button>
                        <button className="btn btn-r btn-sm" onClick={()=>cambiarEstado(sel.id,"rechazada")}>Rechazar</button>
                      </>
                    )}
                    {sel.estado==="aprobada"&&(
                      <>
                        <button className="btn btn-p btn-sm" onClick={()=>generarMemo(sel,"AF")}
                          style={{background:C.navy}}>
                          📋 Memo Inicio AF
                        </button>
                        <button className="btn btn-p btn-sm" onClick={()=>generarMemo(sel,"EX")}
                          style={{background:"#0891b2"}}>
                          📋 Memo Inicio Existencias
                        </button>
                      </>
                    )}
                    <button className="btn btn-s btn-sm" onClick={()=>generarPDF(sel)}>{I.dl} PDF</button>
                    {/* Editar */}
                    {["borrador","enviada","negociacion"].includes(sel.estado)&&(
                      <button className="btn btn-s btn-sm" onClick={()=>setModalEditar({...sel,alcanceStr:(sel.alcance||[]).join("\n")})}>
                        ✏️ Editar
                      </button>
                    )}
                    {/* Eliminar */}
                    <button className="btn btn-r btn-sm" style={{marginLeft:"auto"}}
                      onClick={()=>setConfirmElim(sel.id)}>
                      🗑 Eliminar
                    </button>
                  </div>
                )}
              </div>

              {/* Historial de versiones */}
              <div className="card">
                <div className="card-hd"><div className="ct">Historial de versiones</div></div>
                {sel.historial.map((h,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 16px",borderBottom:"1px solid var(--bd)",alignItems:"flex-start"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:C.blue+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:C.blue}}>v{h.v}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span className={"pill "+ESTADOS[h.estado]?.col} style={{fontSize:9}}>{ESTADOS[h.estado]?.lbl||h.estado}</span>
                        <span style={{fontSize:10,color:"var(--t3)"}}>{h.fecha}</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--t2)"}}>{h.nota}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div style={{background:"var(--card)",border:"1px solid var(--bd)",borderRadius:"var(--r)",padding:40,textAlign:"center",color:"var(--t3)"}}>
              <div style={{fontSize:28,marginBottom:8}}>📄</div>
              Selecciona una propuesta para ver el detalle
            </div>
          )}
        </div>
      )}

      {/* -- PIPELINE VISUAL -- */}
      {tab==="pipeline"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,alignItems:"start"}}>
          {["borrador","enviada","negociacion","aprobada","rechazada"].map(est=>{
            const pEst = props.filter(p=>p.estado===est);
            const totalEst = pEst.reduce((a,p)=>a+p.valor,0);
            return(
              <div key={est} style={{background:"var(--bg)",borderRadius:"var(--r)",border:"1px solid var(--bd)",overflow:"hidden"}}>
                <div style={{height:3,background:ESTADOS[est]?.col==="teal"?C.teal:ESTADOS[est]?.col==="blue"?C.blue:ESTADOS[est]?.col==="amber"?C.amber:ESTADOS[est]?.col==="red"?C.red:C.navy}}/>
                <div style={{padding:"8px 10px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{ESTADOS[est]?.lbl}</div>
                  <span style={{fontSize:10,background:"var(--hv)",padding:"1px 6px",borderRadius:8,color:"var(--t2)",fontWeight:600}}>{pEst.length}</span>
                </div>
                {totalEst>0&&<div className="mono" style={{fontSize:11,color:C.blue,fontWeight:700,padding:"4px 10px",borderBottom:"1px solid var(--bd)"}}>{"$"+fi(totalEst)}</div>}
                <div style={{padding:6,display:"flex",flexDirection:"column",gap:6}}>
                  {pEst.map(p=>(
                    <div key={p.id} onClick={()=>{setSel(p);setTab("lista");}}
                      style={{background:"var(--card)",borderRadius:4,padding:"9px 10px",cursor:"pointer",border:"1px solid var(--bd)",transition:"border-color .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--bd)"}>
                      <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",marginBottom:3,lineHeight:1.3}}>{(p.cliente||"").substring(0,20)}</div>
                      <div className="mono" style={{fontSize:12,fontWeight:800,color:C.blue}}>{"$"+fi(p.valor)}</div>
                      <div style={{fontSize:9,color:"var(--t3)",marginTop:3}}>{p.fecha} · {p.plazo}</div>
                    </div>
                  ))}
                  {pEst.length===0&&<div style={{padding:"12px 8px",textAlign:"center",color:"var(--t3)",fontSize:11}}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- ESTADÍSTICAS -- */}
      {tab==="estadisticas"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card">
            <div className="card-hd"><div className="ct">Propuestas por estado</div></div>
            <div className="cb">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={Object.entries(ESTADOS).map(([k,v])=>({name:v.lbl,value:props.filter(p=>p.estado===k).length,color:k==="aprobada"?C.teal:k==="enviada"?C.blue:k==="negociacion"?C.amber:k==="rechazada"?C.red:C.navy})).filter(d=>d.value>0)}
                    cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>
                    {Object.entries(ESTADOS).map(([k,v],i)=><Cell key={i} fill={k==="aprobada"?C.teal:k==="enviada"?C.blue:k==="negociacion"?C.amber:k==="rechazada"?C.red:C.navy}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n)=>[v+" propuestas",n]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-hd"><div className="ct">Valor por estado (USD)</div></div>
            <div className="cb">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(ESTADOS).map(([k,v])=>({name:v.lbl,valor:props.filter(p=>p.estado===k).reduce((a,p)=>a+p.valor,0)}))} margin={{top:4,right:8,left:-18,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"var(--t3)"}}/>
                  <YAxis tick={{fontSize:9,fill:"var(--t3)"}}/>
                  <Tooltip content={<CTip pre="$"/>}/>
                  <Bar dataKey="valor" name="Valor" radius={[2,2,0,0]}>
                    {Object.entries(ESTADOS).map(([k],i)=><Cell key={i} fill={k==="aprobada"?C.teal:k==="enviada"?C.blue:k==="negociacion"?C.amber:k==="rechazada"?C.red:C.navy}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card" style={{gridColumn:"1/-1"}}>
            <div className="card-hd"><div className="ct">Resumen ejecutivo</div></div>
            <div className="cb">
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {[
                  {l:"Tasa de éxito",v:tasaExito+"%",d:"Aprobadas vs enviadas",col:tasaExito>=60?"teal":"amber"},
                  {l:"Valor aprobado",v:"$"+fi(totalAprobado),d:"Contratos cerrados",col:"teal"},
                  {l:"Pipeline activo",v:"$"+fi(totalEnviado),d:"Enviadas + negociación",col:"blue"},
                  {l:"Tiempo promedio",v:"3 días",d:"De envío a respuesta",col:"navy"},
                ].map((k,i)=>(
                  <div key={i} style={{padding:"12px 14px",background:"var(--hv)",borderRadius:"var(--r)",border:"1px solid var(--bd)"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{k.l}</div>
                    <div className="mono" style={{fontSize:18,fontWeight:800,color:k.col==="teal"?C.teal:k.col==="blue"?C.blue:k.col==="amber"?C.amber:C.navy}}>{k.v}</div>
                    <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{k.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================

// -- Badge "Nuevo / Actualizado" temporal -------------------------------------
function NewBadge({txt="✦ Nuevo"}) {
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",
      background:"#0D9488",color:"#fff",
      fontSize:9,fontWeight:800,letterSpacing:.3,
      padding:"2px 8px",borderRadius:10,
      marginLeft:6,verticalAlign:"middle",
      boxShadow:"0 2px 6px rgba(13,148,136,.5)",
      flexShrink:0,whiteSpace:"nowrap"
    }}>{txt}</span>
  );
}

function Reportes({proyectos,cotizaciones,leads,toast,periodo="mensual",setPeriodo}) {
  const tc=proyectos.reduce((a,p)=>a+p.valor,0);
  const tCob=proyectos.reduce((a,p)=>a+p.cobrado,0);
  const mg=proyectos.length>0?proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length:0;
  const [tab,setTab]=useState("catalogo"); // inicia en catálogo para mostrar novedades
  const [selRpt,setSelRpt]=useState(null);

  const RPTS=[
    {id:"R01",cat:"Comercial",   nom:"Pipeline CRM",             fmt:["PDF","Excel"],icon:"crm",
     desc:"Estado actual del pipeline comercial por etapa, valor y probabilidad de cierre."},
    {id:"R02",cat:"Comercial",   nom:"Ranking de Ejecutivos ✦",    fmt:["PDF","Excel"],icon:"usr",
     desc:"Desempeño de ejecutivos: leads gestionados, conversión y valor cerrado."},
    {id:"R03",cat:"Financiero",  nom:"Cotizaciones Emitidas",    fmt:["Excel"],      icon:"prf",
     desc:"Listado completo de cotizaciones con márgenes, estados y comparativo histórico."},
    {id:"R04",cat:"Financiero",  nom:"Flujo de Cobros",          fmt:["PDF","Excel"],icon:"bdg",
     desc:"Cronograma de cobros por proyecto: cobrado, pendiente y proyección 90 días."},
    {id:"R05",cat:"Ejecución",   nom:"Avance de Proyectos ✦",      fmt:["PDF","Excel"],        icon:"exe",
     desc:"Estado de avance por proyecto, fase, entregables y horas consumidas."},
    {id:"R06",cat:"Ejecución",   nom:"Control de Entregables",   fmt:["Excel"],      icon:"file",
     desc:"Matriz de entregables por proyecto: estado, fecha límite y responsable."},
    {id:"R07",cat:"Presupuestal",nom:"Real vs. Cotizado",        fmt:["Excel","PDF"],icon:"chrt",
     desc:"Comparativo de costos reales vs cotizados por rubro y proyecto activo."},
    {id:"R08",cat:"Gerencial",   nom:"Informe Ejecutivo Mensual ✦",fmt:["PDF"],        icon:"rpt",
     desc:"Resumen ejecutivo consolidado: KPIs, proyectos, cobros, alertas y proyecciones."},
    {id:"R09",cat:"RRHH",        nom:"Carga de Consultores",     fmt:["Excel","PDF"],icon:"usr",
     desc:"Horas asignadas y disponibles por consultor, carga y proyectos activos."},
    {id:"R10",cat:"Gerencial",   nom:"Rentabilidad por Proyecto",fmt:["PDF","Excel"],icon:"chrt",
     desc:"Margen, utilidad y eficiencia por proyecto con comparativo de sectores."},
    {id:"R11",cat:"Comercial",   nom:"Propuestas Enviadas",      fmt:["PDF","Excel"],icon:"mail",
     desc:"Pipeline de propuestas: versiones, estados, tiempos de respuesta y conversión."},
    {id:"R12",cat:"Financiero",  nom:"Estado de Facturación",    fmt:["PDF","Excel"],icon:"bdg",
     desc:"Facturas emitidas, cobradas, pendientes y vencidas por cliente y proyecto."},
  ];

  const RCAT={Comercial:"blue",Financiero:"teal",Ejecución:"amber",Presupuestal:"purple",Gerencial:"red",RRHH:"navy"};
  const CATS=[...new Set(RPTS.map(r=>r.cat))];

  // Datos para tablero
  const HIST_MES=[
    {mes:"Oct",ing:18500,cos:14300,mg:22.7,cob:12000},
    {mes:"Nov",ing:22000,cos:16900,mg:23.2,cob:18500},
    {mes:"Dic",ing:31500,cos:24100,mg:23.5,cob:28000},
    {mes:"Ene",ing:14000,cos:10800,mg:22.9,cob:10000},
    {mes:"Feb",ing:26500,cos:20300,mg:23.4,cob:22000},
    {mes:"Mar",ing:43000,cos:32700,mg:23.9,cob:38000},
  ];
  // HIST_SECT calculado desde proyectos reales
  const _sectMap={};
  proyectos.forEach(p=>{
    const s=p.sector||p.division?.includes("Miner")?"Minería":p.division?.includes("Retail")?"Retail":"Consultoría";
    if(!_sectMap[s]) _sectMap[s]={sect:s,val:0,proyectos:0};
    _sectMap[s].val+=p.valor; _sectMap[s].proyectos++;
  });
  const _totSect=proyectos.reduce((a,p)=>a+p.valor,0)||1;
  const HIST_SECT=Object.values(_sectMap).sort((a,b)=>b.val-a.val).slice(0,4).map(s=>({...s,pct:Math.round(s.val/_totSect*100)}));
  const TOP_CLIENTES=proyectos.map(p=>({cliente:(p.cliente||"").substring(0,18),valor:p.valor,margen:p.margen,cobrado:p.cobrado})).sort((a,b)=>b.valor-a.valor);

  const generarReporte=(r,fmt)=>{
    const lf=Object.values(leads||{}).flat();
    const sectMap={};
    lf.forEach(l=>{const s=l.sec||"Otro";if(!sectMap[s])sectMap[s]=0;sectMap[s]++;});
    const sectColors=[C.navy,C.blue,C.teal,C.amber,C.red,"#7c3aed"];
    const SECT=Object.entries(sectMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v],i)=>({n,v:Math.round(v/Math.max(lf.length,1)*100),c:sectColors[i%sectColors.length]}));

    // -- EXCEL ------------------------------------------
    if(fmt==="Excel"){
      let cols=[], filas=[];
      const id=r.id;
      if(id==="R01"){
        const lf=Object.values(leads||{}).flat();
        cols=["ID","Cliente","Etapa","Valor USD","Prob%","Temp","Sector","Último contacto"];
        filas=lf.map(l=>[l.id||"",l.co||"",l.stage||"",l.val||0,(l.prob||0)+"%",l.temp||"",l.sec||"",l.last||""]);
      } else if(id==="R02"){
        const lf=Object.values(leads||{}).flat();
        const ex={};
        lf.forEach(l=>{const e=l.exec||l.autor||"Sin asignar";if(!ex[e])ex[e]={nombre:e,leads:0,valor:0,ganados:0};ex[e].leads++;ex[e].valor+=(l.val||0);if(l.stage==="ganado")ex[e].ganados++;});
        cols=["Ejecutivo","Leads","Valor USD","Ganados","Conversión %"];
        filas=Object.values(ex).sort((a,b)=>b.valor-a.valor).map(e=>[e.nombre,e.leads,e.valor,e.ganados,Math.round(e.ganados/Math.max(e.leads,1)*100)+"%"]);
      } else if(id==="R03"){
        cols=["ID","Cliente","Servicio","Fecha","Precio USD","Costo USD","Margen %","Estado","Autor"];
        filas=cotizaciones.map(c=>[c.id,c.cliente,c.servicio,c.fecha,c.venta,c.costo,f1(c.margen)+"%",c.estado,c.autor||"—"]);
      } else if(id==="R04"){
        cols=["Proyecto","Cliente","Valor USD","Cobrado USD","Pendiente USD","% Cobro","Cuotas total","Cuotas cobradas"];
        filas=proyectos.map(p=>[p.id,p.cliente,p.valor,p.cobrado,p.valor-p.cobrado,Math.round(p.cobrado/Math.max(p.valor,1)*100)+"%",(p.cobros||[]).length,(p.cobros||[]).filter(c=>c.estado==="cobrado").length]);
      } else if(id==="R05"){
        cols=["Proyecto","Cliente","Avance%","Inventariados","Presupuestados","%Inv","Margen%","Fase","H.cotizadas","H.reales"];
        filas=proyectos.map(p=>[p.id,p.cliente,p.avance,p.totalInventariado||0,p.activosPresupuestados||0,p.activosPresupuestados>0?Math.round((p.totalInventariado||0)/p.activosPresupuestados*100):0,parseFloat(f1(p.margen)),"F"+p.faseActual,p.horasCot,p.horasReal]);
      } else if(id==="R06"){
        cols=["Proyecto","Cliente","Entregable","Fase","Estado","Fecha"];
        filas=proyectos.flatMap(p=>(p.fases||[]).flatMap(f=>(f.ents||[]).map(e=>[p.id,p.cliente,e.nom||e.nombre||"—","F"+f.id,e.est||"pendiente",e.fecha||"—"])));
      } else if(id==="R07"){
        cols=["Proyecto","Cliente","Horas cotizadas","Horas reales","Variación h","% Ejec","Margen %"];
        filas=proyectos.map(p=>[p.id,p.cliente,p.horasCot,p.horasReal,p.horasReal-p.horasCot,Math.round(p.horasReal/Math.max(p.horasCot,1)*100)+"%",f1(p.margen)+"%"]);
      } else if(id==="R08"){
        const lf2=Object.values(leads||{}).flat();
        cols=["Métrica","Valor","Detalle"];
        filas=[["Pipeline","$"+fi(lf2.filter(l=>l.stage!=="ganado").reduce((a,l)=>a+(l.val||0),0)),"Leads activos"],["Proyectos",proyectos.length,"En ejecución"],["Contratado","$"+fi(proyectos.reduce((a,p)=>a+p.valor,0)),"Total contratos"],["Cobrado","$"+fi(proyectos.reduce((a,p)=>a+p.cobrado,0)),"Efectivo recibido"],["Margen prom.",f1(proyectos.length>0?proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length:0)+"%","Objetivo ≥30%"]];
      } else if(id==="R09"){
        cols=["Consultor","Proyecto","Cargo","Horas cotizadas","Horas reales","% Uso"];
        filas=proyectos.flatMap(p=>(p.personal||[]).map(pe=>[pe.nombre||pe.cargo,p.cliente,pe.cargo,pe.cot||0,pe.real||0,Math.round((pe.real||0)/Math.max(pe.cot||1,1)*100)+"%"]));
      } else if(id==="R10"){
        cols=["Proyecto","Cliente","Valor USD","Cobrado","Margen %","Avance %","Estado"];
        filas=proyectos.map(p=>[p.id,p.cliente,p.valor,p.cobrado,f1(p.margen)+"%",p.avance+"%",p.estado||"ejecucion"]);
      } else if(id==="R11"){
        cols=["ID","Cliente","Servicio","Valor USD","Margen %","Estado","Fecha","Autor"];
        filas=cotizaciones.map(c=>[c.id,c.cliente,c.servicio,fi(c.venta),f1(c.margen)+"%",c.estado,c.fecha,c.autor||"—"]);
      } else if(id==="R12"){
        cols=["Proyecto","Cliente","Cuota","Monto USD","Fecha","Estado"];
        filas=proyectos.flatMap(p=>(p.cobros||[]).map(c=>[p.id,p.cliente,"Cuota "+c.n,fi(c.monto),c.fecha||"—",c.estado||"pendiente"]));
      } else {
        cols=["Proyecto","Cliente","Sector","Valor USD","Avance %","Margen %","Cobrado USD","Estado"];
        filas=proyectos.map(p=>[p.id,p.cliente,p.sector||"—",p.valor,p.avance+"%",f1(p.margen)+"%",p.cobrado,p.estado]);
      }
      descargarExcel((r.nom||r.id).replace(/[^a-zA-Z0-9_-]/g,"_"), cols, filas);
      toast("✓ "+r.nom+" — descargando Excel...","success");
      return;
    }

    // -- PDF — datos comunes ------------------------------
    const tContr=proyectos.reduce((a,p)=>a+p.valor,0);
    const tCobRep=proyectos.reduce((a,p)=>a+p.cobrado,0);
    const tPend=proyectos.reduce((a,p)=>a+(p.valor-p.cobrado),0);
    const mgProm=proyectos.length>0?proyectos.reduce((a,p)=>a+p.margen,0)/proyectos.length:0;
    const avgAv=proyectos.length>0?Math.round(proyectos.reduce((a,p)=>a+p.avance,0)/proyectos.length):0;
    const pctCobRep=tContr>0?Math.round(tCobRep/tContr*100):0;

    // Helpers gráficas
    const mkDonut=(pct,col,lbl)=>{const r2=44,cx=55,cy=55,ci=2*Math.PI*r2;return'<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="'+cx+'" cy="'+cy+'" r="'+r2+'" fill="none" stroke="'+col+'" stroke-width="12" stroke-dasharray="'+(ci*pct/100)+' '+(ci*(1-pct/100))+'" stroke-dashoffset="'+(ci/4)+'" stroke-linecap="round"/><text x="'+cx+'" y="'+(cy+5)+'" fill="#1a2e4a" font-size="15" font-weight="800" text-anchor="middle">'+pct+'%</text><text x="'+cx+'" y="'+(cy+18)+'" fill="#64748b" font-size="8" text-anchor="middle">'+lbl+'</text></svg>';};
    const mkBarras=(items,getLabel,getVal,maxVal,getCol)=>{const bW=54,chH=120,chW=items.length*(bW+10)+50;let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.min(chW,600)+'" height="'+(chH+50)+'" style="font-family:Segoe UI,sans-serif"><rect width="'+Math.min(chW,600)+'" height="'+(chH+50)+'" fill="#f8fafc" rx="6"/>';items.forEach((it,i)=>{const x=22+i*(bW+10),h=Math.max((getVal(it)/Math.max(maxVal,1))*chH,3),col=getCol(it);svg+='<rect x="'+x+'" y="'+(chH-h)+'" width="'+bW+'" height="'+h+'" fill="'+col+'" rx="3"/><text x="'+(x+bW/2)+'" y="'+(chH+14)+'" fill="#64748b" font-size="8" text-anchor="middle">'+getLabel(it).substring(0,8)+'</text><text x="'+(x+bW/2)+'" y="'+(chH-h-5)+'" fill="'+col+'" font-size="7" text-anchor="middle">$'+fi(Math.round(getVal(it)/1000))+'k</text>';});svg+='</svg>';return svg;};
    const mkTabla=(cols2,filas2)=>'<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#1a2e4a;color:#fff">'+cols2.map(c=>'<th style="padding:7px 10px;text-align:left">'+c+'</th>').join('')+'</tr>'+filas2.map((row,i)=>'<tr style="background:'+(i%2?"#f1f5f9":"#fff")+'">'+row.map((v,j)=>'<td style="padding:6px 10px'+(j>0?';text-align:right':'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</table>';

    // -- Contenido específico por reporte ------------------
    let kpis=[], secciones=[], analisis={};
    const id=r.id;
    const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});

    // Helper: tabla HTML rica
    const mkTablaRica=(cols2,filas2,opts={})=>{
      const colores=["#1a2e4a","#4a9fd4","#1D9E75","#BA7517","#E24B4A","#7c3aed"];
      let h='<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px">';
      h+='<thead><tr style="background:#1a2e4a">';
      cols2.forEach(c=>{h+=`<th style="padding:7px 10px;color:#fff;font-weight:600;text-align:left;white-space:nowrap">${c}</th>`;});
      h+='</tr></thead><tbody>';
      filas2.forEach((f,i)=>{
        h+=`<tr style="background:${i%2===0?"#fff":"#f8fafc"}">`;
        f.forEach((v,j)=>{
          const esNum=typeof v==="number"||(typeof v==="string"&&v.startsWith("$"));
          h+=`<td style="padding:6px 10px;color:#1e293b;font-weight:${j===0?"600":"400"};text-align:${esNum?"right":"left"};font-family:${esNum?"monospace":"inherit"}">${v??""}</td>`;
        });
        h+='</tr>';
      });
      h+='</tbody></table>';
      if(opts.total){h+=`<div style="text-align:right;font-size:11px;font-weight:700;color:#1a2e4a;padding:4px 10px">${opts.total}</div>`;}
      return h;
    };

    const mkKpiBox=(items)=>{
      let h='<div style="display:grid;grid-template-columns:repeat('+Math.min(items.length,4)+',1fr);gap:10px;margin-bottom:14px">';
      items.forEach(k=>{h+=`<div style="background:${k.bg||"#f8fafc"};border:1px solid ${k.col||"#e2e8f0"};border-top:3px solid ${k.col||"#4a9fd4"};border-radius:8px;padding:12px 14px;text-align:center"><div style="font-size:20px;font-weight:800;color:${k.col||"#1a2e4a"};font-family:monospace">${k.value}</div><div style="font-size:10px;color:#64748b;margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">${k.label}</div></div>`;});
      h+='</div>';
      return h;
    };

    const mkBarrasV=(items,getLabel,getVal,maxVal,getCol)=>{
      const bW=56,chH=130,chW=Math.max(items.length*(bW+12)+60,300);
      let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${chW}" height="${chH+50}" style="font-family:Segoe UI,sans-serif">`;
      const maxV2=maxVal||Math.max(...items.map(getVal),1);
      items.forEach((it,i)=>{
        const x=40+i*(bW+12),h2=Math.max((getVal(it)/maxV2)*(chH-20),getVal(it)>0?4:0),y=chH-h2,col=getCol?getCol(it):"#4a9fd4";
        s+=`<rect x="${x}" y="${y}" width="${bW}" height="${h2}" rx="3" fill="${col}"/>`;
        s+=`<text x="${x+bW/2}" y="${y-4}" text-anchor="middle" font-size="9" fill="#1e293b" font-weight="600">${typeof getVal(it)==="number"&&getVal(it)>999?fi(getVal(it)):getVal(it)}</text>`;
        const lbl=getLabel(it);const lblParts=lbl.length>10?[lbl.substring(0,10),lbl.substring(10,20)]:([lbl]);
        lblParts.forEach((part,pi)=>{s+=`<text x="${x+bW/2}" y="${chH+14+pi*12}" text-anchor="middle" font-size="8" fill="#64748b">${part}</text>`;});
      });
      s+=`<line x1="36" y1="10" x2="36" y2="${chH}" stroke="#e2e8f0" stroke-width="1"/>`;
      s+=`<line x1="36" y1="${chH}" x2="${chW-10}" y2="${chH}" stroke="#e2e8f0" stroke-width="1"/>`;
      s+='</svg>';
      return s;
    };

    if(id==="R01"){ // Pipeline CRM
      const lf=Object.values(leads||{}).flat();
      const ganados=lf.filter(l=>l.stage==="ganado");
      const activos=lf.filter(l=>l.stage!=="ganado");
      const pipeVal=activos.reduce((a,l)=>a+(l.val||0),0);
      const ganVal =ganados.reduce((a,l)=>a+(l.val||0),0);
      const convRate=lf.length>0?Math.round(ganados.length/lf.length*100):0;
      const byStage={prospecto:0,calificado:0,propuesta:0,negociacion:0,ganado:0};
      lf.forEach(l=>{if(byStage[l.stage]!==undefined)byStage[l.stage]++;});
      const byExec={};
      lf.forEach(l=>{const e=l.exec||"Sin asignar";if(!byExec[e])byExec[e]={nombre:e,leads:0,valor:0,ganados:0};byExec[e].leads++;byExec[e].valor+=(l.val||0);if(l.stage==="ganado")byExec[e].ganados++;});
      const execs=Object.values(byExec).sort((a,b)=>b.valor-a.valor);
      const etapasItems=[{lbl:"Prospecto",v:byStage.prospecto,col:"#94a3b8"},{lbl:"Calificado",v:byStage.calificado,col:"#4a9fd4"},{lbl:"Propuesta",v:byStage.propuesta,col:"#BA7517"},{lbl:"Negociación",v:byStage.negociacion,col:"#7c3aed"},{lbl:"Ganado",v:byStage.ganado,col:"#1D9E75"}];
      const barEtapas=mkBarrasV(etapasItems,e=>e.lbl,e=>e.v,Math.max(...etapasItems.map(e=>e.v),1),e=>e.col);
      const tabLeads=mkTablaRica(["ID","Cliente","Ejecutivo","Etapa","Valor USD","Prob %","Sector","Temp."],lf.map(l=>[l.id,l.co,l.exec||"—",l.stage,"$"+fi(l.val||0),(l.prob||0)+"%",l.sec||"—",l.temp||"WARM"]));
      const tabExec=mkTablaRica(["Ejecutivo","Leads totales","Valor USD","Ganados","Conversión"],execs.map(e=>[e.nombre,e.leads,"$"+fi(e.valor),e.ganados,Math.round(e.ganados/Math.max(e.leads,1)*100)+"%"]));
      kpis=[{label:"Pipeline activo",value:"$"+fi(pipeVal),col:"#4a9fd4"},{label:"Valor ganado",value:"$"+fi(ganVal),col:"#1D9E75"},{label:"Leads totales",value:lf.length,col:"#1a2e4a"},{label:"Conversión",value:convRate+"%",col:"#BA7517"}];
      secciones=[
        {titulo:"Distribución del Pipeline por Etapa",contenido:mkKpiBox(etapasItems.map(e=>({label:e.lbl,value:e.v,col:e.col})))+barEtapas},
        {titulo:"Leads Activos — Detalle Completo",contenido:tabLeads},
        {titulo:"Ranking de Ejecutivos Comerciales",contenido:tabExec},
      ];
      analisis={situacion:"Pipeline comercial con <strong>"+lf.length+" leads</strong> registrados. Valor pipeline activo: <strong>$"+fi(pipeVal)+"</strong>. Valor ganado: <strong>$"+fi(ganVal)+"</strong>. Tasa de conversión: <strong>"+convRate+"%</strong>. Ejecutivos activos: <strong>"+execs.length+"</strong>.",recomendaciones:"<strong>1.</strong> Priorizar los "+activos.filter(l=>l.temp==="HOT").length+" leads HOT en negociación avanzada.<br/><strong>2.</strong> Ejecutivos con conversión bajo 50% requieren seguimiento.<br/><strong>3.</strong> Leads en etapa propuesta >30 días sin movimiento deben ser recontactados."};
    }
    else if(id==="R02"){ // Ranking Ejecutivos
      const lf=Object.values(leads||{}).flat();
      const execs2={};
      lf.forEach(l=>{const e=l.exec||"Sin asignar";if(!execs2[e])execs2[e]={nombre:e,leads:0,valor:0,ganados:0,pipeline:0,hot:0};execs2[e].leads++;execs2[e].valor+=(l.val||0);if(l.stage==="ganado"){execs2[e].ganados++;execs2[e].pipeline+=(l.val||0);}if(l.temp==="HOT")execs2[e].hot++;});
      const ranking=Object.values(execs2).sort((a,b)=>b.valor-a.valor);
      const tabExec2=mkTablaRica(["#","Ejecutivo","Leads","Valor USD","Ganados","Conversión","HOT"],ranking.map((e,i)=>[(i+1)+"°",e.nombre,e.leads,"$"+fi(e.valor),e.ganados,Math.round(e.ganados/Math.max(e.leads,1)*100)+"%",e.hot]));
      const barEj=mkBarrasV(ranking,e=>e.nombre.split(" ")[0],e=>e.valor,null,(_,i)=>["#1a2e4a","#4a9fd4","#1D9E75","#BA7517","#E24B4A"][i%5]);
      kpis=[{label:"Ejecutivos",value:ranking.length,col:"#1a2e4a"},{label:"Leads totales",value:lf.length,col:"#4a9fd4"},{label:"Valor total",value:"$"+fi(lf.reduce((a,l)=>a+(l.val||0),0)),col:"#1D9E75"},{label:"Ganados",value:lf.filter(l=>l.stage==="ganado").length,col:"#BA7517"}];
      secciones=[{titulo:"Valor comercial por ejecutivo",contenido:barEj},{titulo:"Ranking detallado de ejecutivos",contenido:tabExec2}];
      analisis={situacion:"Equipo de <strong>"+ranking.length+" ejecutivos</strong> gestionando <strong>"+lf.length+" leads</strong>. Top ejecutivo: <strong>"+(ranking[0]?.nombre||"—")+"</strong> con $"+fi(ranking[0]?.valor||0)+".",recomendaciones:"<strong>1.</strong> Reconocer públicamente a los top 3 ejecutivos.<br/><strong>2.</strong> Compartir mejores prácticas del ejecutivo líder con el equipo.<br/><strong>3.</strong> Asignar mentoring a ejecutivos con conversión baja."};
    }
    else if(id==="R03"){ // Cotizaciones Emitidas
      const porEst={calificado:0,propuesta:0,negociacion:0,ganado:0,perdido:0};
      cotizaciones.forEach(c=>{if(porEst[c.estado]!==undefined)porEst[c.estado]++;});
      const ganadas=cotizaciones.filter(c=>c.estado==="ganado");
      const tabCots=mkTablaRica(["ID","Cliente","Servicio","Fecha","Precio USD","Costo USD","Margen %","Estado","Autor"],cotizaciones.map(c=>[c.id,c.cliente,c.servicio||c.proyecto||"—",c.fecha,"$"+fi(c.venta||0),"$"+fi(c.costo||0),f1(c.margen||0)+"%",c.estado,c.autor||"—"]));
      const resEst=mkTablaRica(["Estado","Cantidad","% del total"],[["Calificado",porEst.calificado,Math.round(porEst.calificado/Math.max(cotizaciones.length,1)*100)+"%"],["Propuesta",porEst.propuesta,Math.round(porEst.propuesta/Math.max(cotizaciones.length,1)*100)+"%"],["Negociación",porEst.negociacion,Math.round(porEst.negociacion/Math.max(cotizaciones.length,1)*100)+"%"],["Ganado",porEst.ganado,Math.round(porEst.ganado/Math.max(cotizaciones.length,1)*100)+"%"]]);
      kpis=[{label:"Total cotizaciones",value:cotizaciones.length,col:"#1a2e4a"},{label:"Valor total",value:"$"+fi(cotizaciones.reduce((a,c)=>a+(c.venta||0),0)),col:"#4a9fd4"},{label:"Ganadas",value:ganadas.length,col:"#1D9E75"},{label:"Margen promedio",value:f1(cotizaciones.reduce((a,c)=>a+(c.margen||0),0)/Math.max(cotizaciones.length,1))+"%",col:"#BA7517"}];
      secciones=[{titulo:"Resumen por estado",contenido:resEst},{titulo:"Detalle completo de cotizaciones",contenido:tabCots}];
      analisis={situacion:"<strong>"+cotizaciones.length+" cotizaciones</strong> emitidas. Valor total: <strong>$"+fi(cotizaciones.reduce((a,c)=>a+(c.venta||0),0))+"</strong>. Ganadas: <strong>"+ganadas.length+"</strong> por <strong>$"+fi(ganadas.reduce((a,c)=>a+(c.venta||0),0))+"</strong>.",recomendaciones:"<strong>1.</strong> Revisar cotizaciones en estado propuesta >21 días.<br/><strong>2.</strong> Cotizaciones con margen bajo 20% requieren revisión de costos.<br/><strong>3.</strong> Mantener seguimiento mensual del win rate."};
    }
    else if(id==="R04"){ // Flujo de cobros
      const tabCobros=mkTablaRica(["Proyecto","Cliente","Valor USD","Cobrado USD","Pendiente USD","% Cobro","Cuotas"],proyectos.map(p=>["#"+p.id,p.cliente,"$"+fi(p.valor||0),"$"+fi(p.cobrado||0),"$"+fi((p.valor||0)-(p.cobrado||0)),Math.round((p.cobrado||0)/Math.max(p.valor||1,1)*100)+"%",(p.cobros||[]).length+" cuotas"]));
      const detCobros=mkTablaRica(["Proyecto","Cliente","Cuota","Monto USD","Fecha","Estado"],proyectos.flatMap(p=>(p.cobros||[]).map(c=>["#"+p.id,p.cliente,"Cuota "+c.n,"$"+fi(c.monto||0),c.fecha||"—",c.est||c.estado||"pendiente"])));
      const pendiente=proyectos.reduce((a,p)=>a+((p.valor||0)-(p.cobrado||0)),0);
      const cobrado=proyectos.reduce((a,p)=>a+(p.cobrado||0),0);
      const total=proyectos.reduce((a,p)=>a+(p.valor||0),0);
      kpis=[{label:"Cartera total",value:"$"+fi(total),col:"#1a2e4a"},{label:"Cobrado",value:"$"+fi(cobrado),col:"#1D9E75"},{label:"Pendiente",value:"$"+fi(pendiente),col:"#E24B4A"},{label:"% Cobrado",value:Math.round(cobrado/Math.max(total,1)*100)+"%",col:"#BA7517"}];
      secciones=[{titulo:"Estado de cobros por proyecto",contenido:tabCobros},{titulo:"Cronograma detallado de cuotas",contenido:detCobros}];
      analisis={situacion:"Cartera total: <strong>$"+fi(total)+"</strong>. Cobrado: <strong>$"+fi(cobrado)+"</strong> ("+Math.round(cobrado/Math.max(total,1)*100)+"%). Pendiente por cobrar: <strong>$"+fi(pendiente)+"</strong>.",recomendaciones:"<strong>1.</strong> Gestionar cobros pendientes con antigüedad >30 días.<br/><strong>2.</strong> Priorizar proyectos con porcentaje de cobro menor al 50%.<br/><strong>3.</strong> Coordinar con Finanzas la programación de cuotas próximas."};
    }
    else if(id==="R05"){ // Avance de proyectos
      const tabAv=mkTablaRica(["Proyecto","Cliente","Avance %","Inventariados","Presupuestados","% Inv","Margen %","Fase actual","H.cotiz","H.real"],proyectos.map(p=>["#"+p.id,p.cliente,p.avance+"%",fi(p.totalInventariado||0),fi(p.activosPresupuestados||0),p.activosPresupuestados>0?Math.round((p.totalInventariado||0)/p.activosPresupuestados*100)+"%":"—",f1(p.margen||0)+"%",p.faseActual||p.estado||"—",fi(p.horasCot||0)+"h",fi(p.horasReal||0)+"h"]));
      const barAv=mkBarrasV(proyectos,p=>p.cliente.split(" ")[0],p=>p.avance||0,100,p=>(p.avance||0)>=70?"#1D9E75":(p.avance||0)>=40?"#BA7517":"#E24B4A");
      const tabFases=mkTablaRica(["Proyecto","Cliente","Fase","Entregables","Completados","Avance fase"],proyectos.flatMap(p=>(p.fases||[]).map(f=>["#"+p.id,p.cliente,f.nom||f.nombre||"—",(f.ents||[]).length,(f.ents||[]).filter(e=>e.est==="entregado").length,Math.round((f.ents||[]).filter(e=>e.est==="entregado").length/Math.max((f.ents||[]).length,1)*100)+"%"])));
      const avgAv2=proyectos.length>0?Math.round(proyectos.reduce((a,p)=>a+(p.avance||0),0)/proyectos.length):0;
      kpis=[{label:"Proyectos activos",value:proyectos.length,col:"#1a2e4a"},{label:"Avance promedio",value:avgAv2+"%",col:"#4a9fd4"},{label:">70% avance",value:proyectos.filter(p=>(p.avance||0)>=70).length,col:"#1D9E75"},{label:"En riesgo (<40%)",value:proyectos.filter(p=>(p.avance||0)<40).length,col:"#E24B4A"}];
      secciones=[{titulo:"Avance por proyecto",contenido:barAv},{titulo:"Detalle de avance y horas",contenido:tabAv},{titulo:"Fases y entregables",contenido:tabFases}];
      analisis={situacion:"<strong>"+proyectos.length+" proyectos</strong> activos con avance promedio del <strong>"+avgAv2+"%</strong>. "+proyectos.filter(p=>(p.avance||0)>=70).length+" proyectos sobre el 70% de avance. "+proyectos.filter(p=>(p.avance||0)<40).length+" proyectos en zona de riesgo.",recomendaciones:"<strong>1.</strong> Revisar cronograma de proyectos con avance menor al 40%.<br/><strong>2.</strong> Confirmar disponibilidad de personal para fases críticas.<br/><strong>3.</strong> Actualizar entregables semanalmente para reflejar avance real."};
    }
    else if(id==="R06"){ // Control de Entregables
      const allEnts=proyectos.flatMap(p=>(p.fases||[]).flatMap(f=>(f.ents||[]).map(e=>({...e,proy:p.cliente,proyId:p.id,fase:f.nom||f.nombre||"—"}))));
      const vencidos=allEnts.filter(e=>e.est!=="entregado"&&e.fecha&&new Date(e.fecha)<new Date());
      const completados=allEnts.filter(e=>e.est==="entregado");
      const tabEnts=mkTablaRica(["Proyecto","Fase","Entregable","Estado","Fecha","Responsable"],allEnts.map(e=>[e.proy,e.fase,e.nom||e.nombre||"—",e.est||"pendiente",e.fecha||"—",e.resp||e.responsable||"—"]));
      const tabVenc=vencidos.length>0?mkTablaRica(["Proyecto","Entregable","Fecha vencimiento","Días vencido"],vencidos.map(e=>[e.proy,e.nom||e.nombre||"—",e.fecha||"—",e.fecha?Math.floor((new Date()-new Date(e.fecha))/(1000*60*60*24))+" días":"—"])):"<p style='color:#1D9E75;font-weight:600'>✓ Sin entregables vencidos</p>";
      kpis=[{label:"Total entregables",value:allEnts.length,col:"#1a2e4a"},{label:"Completados",value:completados.length,col:"#1D9E75"},{label:"Pendientes",value:allEnts.length-completados.length,col:"#BA7517"},{label:"Vencidos",value:vencidos.length,col:"#E24B4A"}];
      secciones=[{titulo:"Entregables vencidos — Acción inmediata",contenido:tabVenc},{titulo:"Matriz completa de entregables",contenido:tabEnts}];
      analisis={situacion:"<strong>"+allEnts.length+" entregables</strong> totales. Completados: <strong>"+completados.length+"</strong>. Pendientes: <strong>"+(allEnts.length-completados.length)+"</strong>. Vencidos: <strong style='color:#E24B4A'>"+vencidos.length+"</strong>.",recomendaciones:"<strong>1.</strong> Gestionar inmediatamente los "+vencidos.length+" entregables vencidos.<br/><strong>2.</strong> Asignar responsable específico a cada entregable pendiente.<br/><strong>3.</strong> Revisar fechas críticas en reunión de equipo semanal."};
    }
    else if(id==="R07"){ // Real vs Cotizado
      const tabRvC=mkTablaRica(["Proyecto","Cliente","H.cotizadas","H.reales","Variación","% Ejec","Margen %","Alerta"],proyectos.map(p=>{const vari=(p.horasReal||0)-(p.horasCot||0);const alerta=vari>0?"⚠ Sobreuso":vari<-(p.horasCot||1)*0.2?"✓ Bajo presupuesto":"= En presupuesto";return["#"+p.id,p.cliente,fi(p.horasCot||0)+"h",fi(p.horasReal||0)+"h",(vari>=0?"+":"")+fi(vari)+"h",Math.round((p.horasReal||0)/Math.max(p.horasCot||1,1)*100)+"%",f1(p.margen||0)+"%",alerta];}));
      const hCot=proyectos.reduce((a,p)=>a+(p.horasCot||0),0);
      const hReal=proyectos.reduce((a,p)=>a+(p.horasReal||0),0);
      const varTotal=hReal-hCot;
      const barH=mkBarrasV(proyectos,p=>p.cliente.split(" ")[0],p=>p.horasCot||0,null,()=>"#4a9fd4");
      kpis=[{label:"H.cotizadas total",value:fi(hCot)+"h",col:"#1a2e4a"},{label:"H.reales total",value:fi(hReal)+"h",col:"#4a9fd4"},{label:"Variación",value:(varTotal>=0?"+":"")+fi(varTotal)+"h",col:varTotal>0?"#E24B4A":"#1D9E75"},{label:"Eficiencia",value:Math.round(hReal/Math.max(hCot,1)*100)+"%",col:"#BA7517"}];
      secciones=[{titulo:"Horas cotizadas por proyecto",contenido:barH},{titulo:"Comparativo real vs cotizado",contenido:tabRvC}];
      analisis={situacion:"Total horas cotizadas: <strong>"+fi(hCot)+"h</strong>. Horas reales: <strong>"+fi(hReal)+"h</strong>. Variación: <strong>"+(varTotal>=0?"+":"")+fi(varTotal)+"h</strong>. Proyectos con sobreuso: <strong>"+proyectos.filter(p=>(p.horasReal||0)>(p.horasCot||0)).length+"</strong>.",recomendaciones:"<strong>1.</strong> Revisar proyectos con variación de horas mayor al 20%.<br/><strong>2.</strong> Ajustar cotizaciones futuras con base en el registro de horas reales.<br/><strong>3.</strong> Implementar alerta temprana cuando se consuma el 80% de horas cotizadas."};
    }
    else if(id==="R08"){ // Informe Ejecutivo Mensual
      const lf2=Object.values(leads||{}).flat();
      const pipeVal2=lf2.filter(l=>l.stage!=="ganado").reduce((a,l)=>a+(l.val||0),0);
      const tContr2=proyectos.reduce((a,p)=>a+(p.valor||0),0);
      const tCob2=proyectos.reduce((a,p)=>a+(p.cobrado||0),0);
      const mg2=proyectos.length>0?proyectos.reduce((a,p)=>a+(p.margen||0),0)/proyectos.length:0;
      const tabProy=mkTablaRica(["Proyecto","Cliente","Valor USD","Cobrado","Pendiente","Avance","Margen","Estado"],proyectos.map(p=>["#"+p.id,p.cliente,"$"+fi(p.valor||0),"$"+fi(p.cobrado||0),"$"+fi((p.valor||0)-(p.cobrado||0)),(p.avance||0)+"%",f1(p.margen||0)+"%",p.estado||"—"]));
      const tabKPIs=mkTablaRica(["Indicador","Valor","Referencia","Semáforo"],[["Cartera total","$"+fi(tContr2),"Contrato firmado","✓"],["Cobrado","$"+fi(tCob2),"≥60% de cartera",tCob2/Math.max(tContr2,1)>=0.6?"✓ OK":"⚠ Revisar"],["Pipeline","$"+fi(pipeVal2),"Leads activos","→"],["Avance prom.",""+Math.round(proyectos.reduce((a,p)=>a+(p.avance||0),0)/Math.max(proyectos.length,1))+"%","≥50% esperado",proyectos.reduce((a,p)=>a+(p.avance||0),0)/Math.max(proyectos.length,1)>=50?"✓ OK":"⚠ Revisar"],["Margen prom.",f1(mg2)+"%","≥22% objetivo",mg2>=22?"✓ OK":"⚠ Bajo meta"]]);
      kpis=[{label:"Cartera 2026",value:"$"+fi(tContr2),col:"#1a2e4a"},{label:"Cobrado",value:"$"+fi(tCob2),col:"#1D9E75"},{label:"Pipeline",value:"$"+fi(pipeVal2),col:"#4a9fd4"},{label:"Margen prom.",value:f1(mg2)+"%",col:"#BA7517"}];
      secciones=[{titulo:"KPIs ejecutivos — Panel de control",contenido:tabKPIs},{titulo:"Estado de proyectos activos",contenido:tabProy}];
      analisis={situacion:"Informe ejecutivo al "+fecha+". Cartera: <strong>$"+fi(tContr2)+"</strong>. Cobrado: <strong>$"+fi(tCob2)+"</strong>. Pipeline comercial: <strong>$"+fi(pipeVal2)+"</strong>. Proyectos activos: <strong>"+proyectos.length+"</strong>. Margen promedio: <strong>"+f1(mg2)+"%</strong>.",recomendaciones:"<strong>1.</strong> "+( mg2>=22?"Margen sobre meta — mantener eficiencia operativa.":"Margen bajo meta — revisar estructura de costos de proyectos.")+"<br/><strong>2.</strong> Priorizar cobros pendientes para mejorar flujo de caja.<br/><strong>3.</strong> Acelerar cierre de propuestas en negociación avanzada."};
    }
    else if(id==="R09"){ // Carga de Consultores
      const consultores=proyectos.flatMap(p=>(p.personal||[]).map(pe=>({...pe,proyecto:p.cliente,proyId:p.id})));
      const byConsultor={};
      consultores.forEach(c=>{const k=c.nombre||c.cargo||"Consultor";if(!byConsultor[k])byConsultor[k]={nombre:k,proyectos:[],hCot:0,hReal:0};byConsultor[k].proyectos.push(c.proyecto);byConsultor[k].hCot+=(c.horas||c.cot||0);byConsultor[k].hReal+=(c.horasReal||c.real||0);});
      const tabCons=mkTablaRica(["Consultor","Proyectos","H.Cotizadas","H.Reales","% Uso","Carga"],Object.values(byConsultor).sort((a,b)=>b.hCot-a.hCot).map(c=>[c.nombre,[...new Set(c.proyectos)].join(", ").substring(0,40),fi(c.hCot)+"h",fi(c.hReal)+"h",Math.round(c.hReal/Math.max(c.hCot,1)*100)+"%",c.hCot>0?Math.round(c.hReal/c.hCot*100)+"%":"—"]));
      const tabDetalle=mkTablaRica(["Consultor","Proyecto","Cargo","H.Cotizadas","H.Reales","Variación"],consultores.map(c=>[c.nombre||"—",c.proyecto,c.cargo||"—",fi(c.horas||c.cot||0)+"h",fi(c.horasReal||c.real||0)+"h",((c.horasReal||c.real||0)-(c.horas||c.cot||0)>0?"+":"")+fi((c.horasReal||c.real||0)-(c.horas||c.cot||0))+"h"]));
      kpis=[{label:"Consultores",value:Object.keys(byConsultor).length,col:"#1a2e4a"},{label:"Asignaciones",value:consultores.length,col:"#4a9fd4"},{label:"H.cotizadas",value:fi(consultores.reduce((a,c)=>a+(c.horas||c.cot||0),0))+"h",col:"#1D9E75"},{label:"H.reales",value:fi(consultores.reduce((a,c)=>a+(c.horasReal||c.real||0),0))+"h",col:"#BA7517"}];
      secciones=[{titulo:"Resumen de carga por consultor",contenido:tabCons},{titulo:"Detalle de asignaciones",contenido:tabDetalle}];
      analisis={situacion:"<strong>"+Object.keys(byConsultor).length+" consultores</strong> con <strong>"+consultores.length+" asignaciones</strong> en proyectos activos.",recomendaciones:"<strong>1.</strong> Redistribuir carga en consultores con uso >90%.<br/><strong>2.</strong> Identificar consultores disponibles para próximos proyectos.<br/><strong>3.</strong> Actualizar horas reales semanalmente en el módulo de Ejecución."};
    }
    else if(id==="R10"){ // Rentabilidad por Proyecto
      const tabRent=mkTablaRica(["Proyecto","Cliente","Sector","Valor USD","Costo aprox.","Margen %","Cobrado","Avance","Semáforo"],proyectos.map(p=>{const costoAprox=Math.round((p.valor||0)*(1-((p.margen||0)/100)));const sem=(p.margen||0)>=30?"🟢 Excelente":(p.margen||0)>=22?"🔵 En meta":"🔴 Bajo meta";return["#"+p.id,p.cliente,p.sector||"—","$"+fi(p.valor||0),"$"+fi(costoAprox)+" (est.)",f1(p.margen||0)+"%","$"+fi(p.cobrado||0),(p.avance||0)+"%",sem];}));
      const barM=mkBarrasV(proyectos,p=>p.cliente.split(" ")[0],p=>p.margen||0,50,p=>(p.margen||0)>=30?"#1D9E75":(p.margen||0)>=22?"#4a9fd4":"#E24B4A");
      const mg3=proyectos.reduce((a,p)=>a+(p.margen||0),0)/Math.max(proyectos.length,1);
      kpis=[{label:"Cartera total",value:"$"+fi(proyectos.reduce((a,p)=>a+(p.valor||0),0)),col:"#1a2e4a"},{label:"Margen prom.",value:f1(mg3)+"%",col:mg3>=22?"#1D9E75":"#E24B4A"},{label:"Sobre meta",value:proyectos.filter(p=>(p.margen||0)>=22).length,col:"#1D9E75"},{label:"Bajo meta",value:proyectos.filter(p=>(p.margen||0)<22).length,col:"#E24B4A"}];
      secciones=[{titulo:"Margen por proyecto",contenido:barM},{titulo:"Análisis detallado de rentabilidad",contenido:tabRent}];
      analisis={situacion:"Rentabilidad de <strong>"+proyectos.length+" proyectos</strong>. Margen promedio: <strong>"+f1(mg3)+"%</strong>. Proyectos sobre meta (≥22%): <strong>"+proyectos.filter(p=>(p.margen||0)>=22).length+"</strong>. Bajo meta: <strong>"+proyectos.filter(p=>(p.margen||0)<22).length+"</strong>.",recomendaciones:"<strong>1.</strong> Revisar estructura de costos en proyectos con margen <22%.<br/><strong>2.</strong> Documentar prácticas de proyectos con margen >30% para replicar.<br/><strong>3.</strong> Ajustar tarifas en próximas cotizaciones considerando costos reales."};
    }
    else if(id==="R11"){ // Propuestas Enviadas
      const props=cotizaciones.filter(c=>["propuesta","calificado","negociacion","enviada"].includes(c.estado));
      const ganadas11=cotizaciones.filter(c=>c.estado==="ganado");
      const tabProp=mkTablaRica(["ID","Cliente","Servicio","Valor USD","Margen %","Personal","Estado","Fecha","Autor"],props.map(c=>[c.id,c.cliente,c.servicio||c.proyecto||"—","$"+fi(c.venta||0),f1(c.margen||0)+"%",(c.personal||[]).length+" cargos",c.estado,c.fecha||"—",c.autor||"—"]));
      const tabGanadas=ganadas11.length>0?mkTablaRica(["ID","Cliente","Valor USD","Margen %","Fecha"],ganadas11.map(c=>[c.id,c.cliente,"$"+fi(c.venta||0),f1(c.margen||0)+"%",c.fecha||"—"])):"<p style='color:#64748b;font-size:11px'>Sin propuestas ganadas en el período.</p>";
      kpis=[{label:"Propuestas activas",value:props.length,col:"#1a2e4a"},{label:"Valor en juego",value:"$"+fi(props.reduce((a,c)=>a+(c.venta||0),0)),col:"#4a9fd4"},{label:"Ganadas",value:ganadas11.length,col:"#1D9E75"},{label:"Win rate",value:Math.round(ganadas11.length/Math.max(cotizaciones.length,1)*100)+"%",col:"#BA7517"}];
      secciones=[{titulo:"Propuestas activas en pipeline",contenido:tabProp},{titulo:"Propuestas ganadas",contenido:tabGanadas}];
      analisis={situacion:"<strong>"+props.length+" propuestas</strong> activas con valor total de <strong>$"+fi(props.reduce((a,c)=>a+(c.venta||0),0))+"</strong>. Win rate histórico: <strong>"+Math.round(ganadas11.length/Math.max(cotizaciones.length,1)*100)+"%</strong>.",recomendaciones:"<strong>1.</strong> Dar seguimiento a propuestas con más de 14 días sin respuesta.<br/><strong>2.</strong> Analizar razones de pérdida para mejorar conversión.<br/><strong>3.</strong> Mantener pipeline actualizado para proyecciones de ingresos."};
    }
    else if(id==="R12"){ // Estado de Facturación
      const facturas=proyectos.flatMap(p=>(p.cobros||[]).map(c=>({...c,cliente:p.cliente,proy:p.id})));
      const cobradas=facturas.filter(f=>["cobrado","pagado"].includes(f.est||f.estado));
      const pendientes=facturas.filter(f=>!["cobrado","pagado"].includes(f.est||f.estado));
      const tabFact=mkTablaRica(["Proyecto","Cliente","Cuota","Monto USD","Fecha","Estado"],facturas.map(f=>["#"+f.proy,f.cliente,"Cuota "+(f.n||"—"),"$"+fi(f.monto||0),f.fecha||"—",f.est||f.estado||"pendiente"]));
      const tabPend=pendientes.length>0?mkTablaRica(["Proyecto","Cliente","Cuota","Monto USD","Fecha vencimiento"],pendientes.map(f=>["#"+f.proy,f.cliente,"Cuota "+(f.n||"—"),"$"+fi(f.monto||0),f.fecha||"—"])):"<p style='color:#1D9E75;font-weight:600'>✓ Sin cobros pendientes</p>";
      const totFact=facturas.reduce((a,f)=>a+(f.monto||0),0);
      const totCob=cobradas.reduce((a,f)=>a+(f.monto||0),0);
      kpis=[{label:"Total facturado",value:"$"+fi(totFact),col:"#1a2e4a"},{label:"Cobrado",value:"$"+fi(totCob),col:"#1D9E75"},{label:"Pendiente",value:"$"+fi(totFact-totCob),col:"#E24B4A"},{label:"% Cobrado",value:Math.round(totCob/Math.max(totFact,1)*100)+"%",col:"#BA7517"}];
      secciones=[{titulo:"Cobros pendientes — Acción requerida",contenido:tabPend},{titulo:"Cronograma completo de facturación",contenido:tabFact}];
      analisis={situacion:"Facturación total: <strong>$"+fi(totFact)+"</strong>. Cobrado: <strong>$"+fi(totCob)+"</strong> ("+Math.round(totCob/Math.max(totFact,1)*100)+"%). Pendiente: <strong style='color:#E24B4A'>$"+fi(totFact-totCob)+"</strong>.",recomendaciones:"<strong>1.</strong> Gestionar los "+pendientes.length+" cobros pendientes con el área de Finanzas.<br/><strong>2.</strong> Emitir recordatorio a clientes con cuotas vencidas.<br/><strong>3.</strong> Proyectar flujo de caja con base en fechas de cobros programados."};
    }
    else { // genérico
      const bGen=mkBarrasV(proyectos,p=>p.cliente.split(" ")[0],p=>p.valor||0,null,p=>(p.margen||0)>=30?"#1D9E75":(p.margen||0)>=22?"#4a9fd4":"#E24B4A");
      const tabGen=mkTablaRica(["Proyecto","Cliente","Valor","Avance","Margen","Cobrado","Estado"],proyectos.map(p=>["#"+p.id,p.cliente,"$"+fi(p.valor||0),(p.avance||0)+"%",f1(p.margen||0)+"%","$"+fi(p.cobrado||0),p.estado||"—"]));
      kpis=[{label:"Cartera",value:"$"+fi(proyectos.reduce((a,p)=>a+(p.valor||0),0)),col:"#4a9fd4"},{label:"Cobrado",value:"$"+fi(proyectos.reduce((a,p)=>a+(p.cobrado||0),0)),col:"#1D9E75"},{label:"Proyectos",value:proyectos.length,col:"#1a2e4a"},{label:"Avance prom.",value:Math.round(proyectos.reduce((a,p)=>a+(p.avance||0),0)/Math.max(proyectos.length,1))+"%",col:"#BA7517"}];
      secciones=[{titulo:"Proyectos activos",contenido:bGen},{titulo:"Detalle de proyectos",contenido:tabGen}];
      analisis={situacion:"Cartera de <strong>"+proyectos.length+" proyectos</strong>.",recomendaciones:"Revisar el estado de cada proyecto con el equipo de operaciones."};
    }


    try {
      generarPDFRico({
        nombre:(r.nom||r.id).replace(/[^a-zA-Z0-9]/g,"_")+"_"+new Date().toLocaleDateString("es-PE").replace(/\//g,"-"),
        titulo:r.nom,
        subtitulo:(r.cat||"")+" · NEXOVA · "+new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"}),
        kpis:kpis||[], secciones:secciones||[], analisis:analisis||{}
      });
      toast("✓ "+r.nom+" generado","success");
    } catch(e) {
      toast("Error generando PDF: "+e.message,"error");
    }
  };

  return(
    <div>
      <div className="sh">
        <div><div className="st">Reportería Avanzada</div><div className="ss">{RPTS.length} reportes disponibles · datos en tiempo real</div></div>
        <div style={{display:"flex",gap:8}}>
          <select value={periodo} onChange={e=>setPeriodo(e.target.value)} style={{fontSize:11,padding:"5px 10px",width:"auto"}}>
            {["mensual","trimestral","anual"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
          <button className="btn btn-p btn-sm" onClick={()=>generarReporte({nom:"Informe Ejecutivo Mensual"},`PDF`)}>{I.dl} Informe Ejecutivo</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Contratado 2026",  v:"$"+fi(tc),  col:"blue"},
          {l:"Cobrado",          v:"$"+fi(tCob), col:"teal"},
          {l:"Por cobrar",       v:"$"+fi(tc-tCob),col:"amber"},
          {l:"Margen promedio",  v:f1(mg)+"%",  col:"navy"},
          {l:"Reportes dispon.", v:RPTS.length, col:"blue"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      {RPTS.filter(r=>r.nom.includes("✦")).length>0&&(
        <div style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"10px 14px",marginBottom:10,
          background:"rgba(13,148,136,.08)",
          border:"1px solid rgba(13,148,136,.25)",
          borderRadius:8,fontSize:12,color:"var(--t1)"
        }}>
          <span style={{fontSize:18}}>✦</span>
          <div>
            <strong style={{color:"#0D9488"}}>
              {RPTS.filter(r=>r.nom.includes("✦")).length} reportes actualizados
            </strong>
            <span style={{color:"var(--t2)",marginLeft:6}}>
              — haz clic en las cards marcadas con <strong>✦ Nuevo</strong> para ver los cambios
            </span>
          </div>
          <button style={{marginLeft:"auto",background:"none",border:"none",
            color:"var(--t3)",cursor:"pointer",fontSize:16,padding:"0 4px"}}
            onClick={()=>RPTS.forEach(r=>r.nom=r.nom.replace(" ✦",""))}>✕</button>
        </div>
      )}
      <Tabs tabs={[{id:"tablero",lbl:"Tablero ejecutivo"},{id:"catalogo",lbl:"Catálogo de reportes",highlight:RPTS.filter(r=>r.nom.includes("✦")).length||null},{id:"proyectos",lbl:"Por proyecto"}]} active={tab} onChange={setTab}/>

      {/* -- TABLERO EJECUTIVO -- */}
      {tab==="tablero"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Fila 1: Ingresos vs Costos + Sectores */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            <div className="card">
              <div className="card-hd"><div><div className="ct">Ingresos, Costos y Margen — Últimos 6 meses</div><div className="cs">Barras: USD · Línea: % margen</div></div></div>
              <div className="cb">
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={HIST_MES} margin={{top:4,right:8,left:-18,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:"var(--t3)"}}/>
                    <YAxis yAxisId="left" tick={{fontSize:10,fill:"var(--t3)"}}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:"var(--t3)"}} unit="%" domain={[20,28]}/>
                    <Tooltip content={<CTip pre="$"/>}/>
                    <Bar yAxisId="left" dataKey="ing" name="Ingresos" fill={C.teal}   opacity={.9} radius={[3,3,0,0]}/>
                    <Bar yAxisId="left" dataKey="cos" name="Costos"   fill={C.navy}   opacity={.6} radius={[3,3,0,0]}/>
                    <Bar yAxisId="left" dataKey="cob" name="Cobrado"  fill={C.blue}   opacity={.5} radius={[3,3,0,0]}/>
                    <Line yAxisId="right" type="monotone" dataKey="mg" name="Margen%" stroke={C.amber} strokeWidth={2} dot={{r:3,fill:C.amber}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><div className="ct">Ingresos por sector</div></div>
              <div className="cb">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={HIST_SECT} cx="50%" cy="50%" outerRadius={60} innerRadius={30} dataKey="val" paddingAngle={3}>
                      {HIST_SECT.map((s,i)=><Cell key={i} fill={[C.navy,C.teal,C.blue,C.amber][i]}/>)}
                    </Pie>
                    <Tooltip formatter={(v)=>["$"+fi(v),"Valor"]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:6}}>
                  {HIST_SECT.map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:7,fontSize:11}}>
                      <div style={{width:9,height:9,borderRadius:2,background:[C.navy,C.teal,C.blue,C.amber][i],flexShrink:0}}/>
                      <span style={{flex:1,color:"var(--t2)"}}>{s.sect}</span>
                      <span className="mono" style={{fontWeight:700}}>{"$"+fi(s.val)}</span>
                      <span style={{fontSize:10,color:"var(--t3)"}}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fila 2: Top clientes + Evolución cobros */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div className="card">
              <div className="card-hd"><div className="ct">Top clientes por valor contratado</div></div>
              <table>
                <thead><tr><th>Cliente</th><th style={{textAlign:"right"}}>Valor</th><th style={{textAlign:"right"}}>Cobrado</th><th>Margen</th><th>Avance cobro</th></tr></thead>
                <tbody>
                  {TOP_CLIENTES.map((c,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600,fontSize:11}}>{c.cliente}</td>
                      <td className="mono" style={{textAlign:"right",fontWeight:700}}>{"$"+fi(c.valor)}</td>
                      <td className="mono" style={{textAlign:"right",color:C.teal}}>{"$"+fi(c.cobrado)}</td>
                      <td><span style={{fontSize:11,fontWeight:700,color:margenColor(c.margen)}}>{f1(c.margen)}%</span></td>
                      <td style={{minWidth:80}}><PBar pct={pct(c.cobrado,c.valor)} color={pct(c.cobrado,c.valor)>=75?C.teal:C.amber} height={5}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-hd"><div><div className="ct">Evolución de cobros</div><div className="cs">Ingresos vs cobros efectivos</div></div></div>
              <div className="cb">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={HIST_MES} margin={{top:4,right:8,left:-18,bottom:0}}>
                    <defs>
                      <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.blue} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gCob" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={C.teal} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:"var(--t3)"}}/>
                    <YAxis tick={{fontSize:10,fill:"var(--t3)"}}/>
                    <Tooltip content={<CTip pre="$"/>}/>
                    <Area type="monotone" dataKey="ing" name="Contratado" stroke={C.blue} fill="url(#gIng)" strokeWidth={2}/>
                    <Area type="monotone" dataKey="cob" name="Cobrado"    stroke={C.teal} fill="url(#gCob)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 3: Margen por cotización + Tabla resumen */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
            <div className="card">
              <div className="card-hd"><div><div className="ct">Margen por cotización — Histórico 2026</div><div className="cs">Meta: 22% · Óptimo: 24%</div></div></div>
              <div className="cb">
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={cotizaciones.slice(0,10).map(c=>({id:c.id.replace("COT-2026-0","#"),margen:c.margen,meta:22,opt:24}))} margin={{top:4,right:8,left:-18,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                    <XAxis dataKey="id" tick={{fontSize:9,fill:"var(--t3)"}}/>
                    <YAxis tick={{fontSize:9,fill:"var(--t3)"}} unit="%" domain={[0,32]}/>
                    <Tooltip content={<CTip suf="%"/>}/>
                    <Bar dataKey="margen" name="Margen" radius={[3,3,0,0]}>
                      {cotizaciones.slice(0,10).map((c,i)=><Cell key={i} fill={margenColor(c.margen)}/>)}
                    </Bar>
                    <Line type="monotone" dataKey="meta" name="Meta 22%" stroke={C.amber} strokeWidth={1.5} strokeDasharray="5 4" dot={false}/>
                    <Line type="monotone" dataKey="opt"  name="Óptimo 24%" stroke={C.teal} strokeWidth={1.5} strokeDasharray="3 3" dot={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-hd"><div className="ct">Resumen ejecutivo</div></div>
              <div className="cb" style={{display:"flex",flexDirection:"column",gap:8}}>
                {[
                  {l:"Proyectos activos",     v:proyectos.filter(p=>p.estado==="ejecucion").length,    s:"en ejecución"},
                  {l:"Cotizaciones 2026",      v:cotizaciones.length,  s:"emitidas"},
                  {l:"Efectividad cobro",      v:Math.round(tCob/Math.max(tc,1)*100)+"%", s:"del total contratado"},
                  {l:"Sobre meta de margen",   v:cotizaciones.filter(c=>c.margen>=22).length, s:"cotizaciones ≥22%"},
                  {l:"Bajo meta de margen",    v:cotizaciones.filter(c=>c.margen<22).length, s:"cotizaciones <22%"},
                ].map((k,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"var(--hv)",borderRadius:"var(--r)"}}>
                    <span style={{fontSize:11,color:"var(--t3)"}}>{k.l}</span>
                    <div style={{textAlign:"right"}}>
                      <div className="mono" style={{fontSize:14,fontWeight:800,color:"var(--t1)"}}>{k.v}</div>
                      <div style={{fontSize:9,color:"var(--t3)"}}>{k.s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- CATÁLOGO DE REPORTES -- */}
      {tab==="catalogo"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {CATS.map(cat=>(
            <div key={cat}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"var(--t3)",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                <span className={"pill "+RCAT[cat]}>{cat}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {RPTS.filter(r=>r.cat===cat).map(r=>(
                  <div key={r.id}
                    style={{
                      background:"var(--card)",
                      border:`${r.nom.includes("✦")?"2px solid #0D9488":`1px solid ${selRpt?.id===r.id?C.blue:"var(--bd)"}`}`,
                      borderRadius:"var(--r)",padding:"14px 16px",
                      cursor:"pointer",transition:"all .15s",
                      boxShadow:r.nom.includes("✦")?"0 0 0 3px rgba(13,148,136,.15)":"none",
                      animation:r.nom.includes("✦")?"update-pulse 2.5s ease infinite":undefined
                    }}
                    onClick={()=>{
                      // quitar ✦ al hacer clic
                      if(r.nom.includes("✦")){
                        const idx=RPTS.findIndex(x=>x.id===r.id);
                        if(idx>=0) RPTS[idx].nom=RPTS[idx].nom.replace(" ✦","");
                      }
                      setSelRpt(selRpt?.id===r.id?null:r);
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=selRpt?.id===r.id?C.blue:"var(--bd)"}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <span className="mono" style={{fontSize:10,color:"var(--t3)",fontWeight:700}}>{r.id}</span>
                      <span className={"pill "+RCAT[r.cat]} style={{fontSize:9}}>{r.cat}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:6}}>{r.nom.replace(" ✦","")}{r.nom.includes("✦")&&<NewBadge/>}</div>
                    <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.5,marginBottom:12}}>{r.desc}</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                      {r.fmt.map((fmt,i)=>(
                        <button key={i} className="btn btn-s btn-xs" onClick={e=>{e.stopPropagation();generarReporte(r,fmt);}}>{I.dl} {fmt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- POR PROYECTO -- */}
      {tab==="proyectos"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {proyectos.map(p=>{
            const mgC=margenColor(p.margen);
            const cobPct=pct(p.cobrado,p.valor);
            const horasTotal=p.personal?.reduce((a,x)=>a+x.real,0)||0;
            const horasCot=p.personal?.reduce((a,x)=>a+x.cot,0)||1;
            return(
              <div key={p.id} className="card">
                <div className="card-hd">
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span className="mono" style={{fontSize:11,fontWeight:700,color:C.blue}}>{p.id}</span>
                      <span className={"pill "+(p.estado==="ejecucion"?"teal":"blue")}>{p.estado==="ejecucion"?"En Ejecución":"Iniciando"}</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:"var(--t1)"}}>{p.cliente}</div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>{p.proyecto}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {["PDF","Excel"].map(fmt=>(
                      <button key={fmt} className="btn btn-s btn-sm" onClick={()=>generarReporte({nom:"Reporte_"+p.id},fmt)}>{I.dl} {fmt}</button>
                    ))}
                  </div>
                </div>
                <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,borderBottom:"1px solid var(--bd)"}}>
                  {[
                    {l:"Valor contrato", v:"$"+fi(p.valor),            col:C.blue},
                    {l:"Cobrado",        v:"$"+fi(p.cobrado),          col:C.teal},
                    {l:"Pendiente",      v:"$"+fi(p.pendiente),        col:C.amber},
                    {l:"Margen",         v:f1(p.margen)+"%",           col:mgC},
                    {l:"Avance",         v:p.avance+"%",               col:p.avance>=80?C.teal:C.amber},
                  ].map((k,i)=>(
                    <div key={i} style={{padding:"8px 10px",background:"var(--hv)",borderRadius:"var(--r)"}}>
                      <div style={{fontSize:10,color:"var(--t3)",marginBottom:3}}>{k.l}</div>
                      <div className="mono" style={{fontSize:15,fontWeight:800,color:k.col}}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Progreso de cobro</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1}}><PBar pct={cobPct} color={cobPct>=75?C.teal:C.amber}/></div>
                      <span className="mono" style={{fontSize:12,fontWeight:700,color:cobPct>=75?C.teal:C.amber,minWidth:35}}>{cobPct}%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                      <span style={{fontSize:10,color:"var(--t3)"}}>Inicio: {p.inicio}</span>
                      <span style={{fontSize:10,color:"var(--t3)"}}>Cuotas: {p.cobros?.filter(c=>c.estado==="cobrado").length||0}/{p.cobros?.length||4}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Avance del proyecto</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1}}><PBar pct={p.avance} color={p.avance>=80?C.teal:p.avance>=50?C.amber:C.blue}/></div>
                      <span className="mono" style={{fontSize:12,fontWeight:700,color:p.avance>=80?C.teal:C.amber,minWidth:35}}>{p.avance}%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                      <span style={{fontSize:10,color:"var(--t3)"}}>Fase: {p.fase}</span>
                      <span style={{fontSize:10,color:"var(--t3)"}}>División: {p.division||"Consultoría AF"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// NOTIFICACIONES EN TIEMPO REAL
// ==============================================================================
const NOTIF_INIT = [
  {id:"CHG001",tipo:"info",icono:"🔵",titulo:"✅ Fix: Temperatura en tarjetas",
   cuerpo:"Se corrigió la doble etiqueta de temperatura en las tarjetas del kanban. El badge izquierdo ahora muestra el score (82pts) y el derecho la temperatura real.",
   fecha:"09/04/2026",leida:false,modulo:"crm"},
  {id:"CHG002",tipo:"info",icono:"🔵",titulo:"✅ Fix: Badges del menú",
   cuerpo:"Se eliminaron los badges numéricos hardcodeados (CRM:4, Ejecución:3, Recursos:1, Reportes:3). Las alertas del menú ahora son 100% dinámicas.",
   fecha:"09/04/2026",leida:false,modulo:"dashboard"},
  {id:"CHG003",tipo:"info",icono:"🔵",titulo:"✅ Fix: Notificaciones dinámicas",
   cuerpo:"Las notificaciones ahora reflejan alertas reales del sistema (entregables vencidos, cobros pendientes, leads sin actividad). El badge desaparece al visitar el módulo.",
   fecha:"09/04/2026",leida:false,modulo:"notificaciones"},
  {id:"CHG004",tipo:"info",icono:"🔵",titulo:"✅ Fix: Precio sin decimales",
   cuerpo:"El precio de venta en la calculadora de rentabilidad se muestra redondeado en todos los displays: pantalla grande, KPI, texto PDF y prompt de IA.",
   fecha:"09/04/2026",leida:false,modulo:"rentabilidad"},
  ];

// Generador de notificaciones dinámicas desde datos reales
const generarNotifsDeProyectos = (proyectos=[], cotizaciones=[], leads={}) => {
  const notifs = [];
  const hoy = new Date();
  const fi2 = n => Number(n||0).toLocaleString("es-PE");
  const addN = (id,tipo,icono,titulo,cuerpo,modulo) =>
    notifs.push({id,tipo,icono,titulo,cuerpo,fecha:hoy.toLocaleDateString("es-PE"),leida:false,modulo});

  // Margen bajo en proyectos
  proyectos.filter(p=>p.margen>0&&p.margen<20).forEach((p,i)=>
    addN("mg-"+i,"critico","🔴","Margen bajo — "+p.cliente,
      "Margen actual: "+p.margen.toFixed(1)+"% (objetivo ≥22%). Revisar estructura de costos.","rentabilidad"));

  // Entregables vencidos
  proyectos.forEach(p=>(p.fases||[]).forEach(f=>(f.ents||[])
    .filter(e=>e.est!=="entregado"&&e.fecha&&new Date(e.fecha)<hoy)
    .forEach((e,i)=>{
      const dias=Math.floor((hoy-new Date(e.fecha))/(1000*60*60*24));
      addN("ent-"+p.id+i,"critico","🔴","Entregable atrasado — "+p.cliente,
        "'"+( e.nom||e.nombre||"Entregable")+"' lleva "+dias+" día(s) de retraso ("+( f.nom||f.nombre||"fase")+").","ejecucion");
    })));

  // Cobros vencidos
  proyectos.forEach(p=>(p.cobros||[])
    .filter(c=>!["cobrado","pagado"].includes(c.est||c.estado||"")&&c.fecha&&new Date(c.fecha)<hoy)
    .forEach((c,i)=>{
      const dias=Math.floor((hoy-new Date(c.fecha))/(1000*60*60*24));
      addN("cob-"+p.id+i,"alerta","🟡","Cobro vencido — "+p.cliente,
        "Cuota "+(c.n||"")+" ($"+fi2(c.monto)+") lleva "+dias+" día(s) sin cobrar.","facturacion");
    }));

  // Proyectos con buen avance
  proyectos.filter(p=>(p.avance||0)>=80&&(p.avance||0)<100).forEach((p,i)=>
    addN("av-"+i,"exito","🟢","Proyecto al "+p.avance+"% — "+p.cliente,
      p.cliente+" alcanzó el "+p.avance+"% de avance. Coordinar entregables finales.","ejecucion"));

  // Leads sin actividad >7 días
  Object.values(leads||{}).flat()
    .filter(l=>l.stage!=="ganado"&&l.last&&Math.floor((hoy-new Date(l.last))/(1000*60*60*24))>=7)
    .slice(0,3).forEach((l,i)=>{
      const dias=Math.floor((hoy-new Date(l.last))/(1000*60*60*24));
      addN("lead-"+i,"alerta","🟡","Lead sin actividad — "+l.co,
        l.co+" ($"+fi2(l.val)+") sin contacto hace "+dias+" días. Etapa: "+l.stage+".","crm");
    });

  // Cotizaciones ganadas recientes
  cotizaciones.filter(c=>c.estado==="ganado").slice(0,2).forEach((c,i)=>
    addN("cot-"+i,"exito","🟢","Cotización ganada — "+c.cliente,
      c.id+" ganada por $"+fi2(c.venta)+". Margen: "+(c.margen||0).toFixed(1)+"%.","rentabilidad"));

  if(notifs.length===0)
    addN("ok","info","🔵","Todo al día","Sin alertas pendientes. Proyectos y cobros en orden.","dashboard");

  return notifs;
};

function PanelNotificaciones({usuario,onNav,alertasDin=[],notifsGeneradas=[]}) {
  const [notifs,setNotifs] = useState([]);
  const [historial,setHistorial] = useState([]);

  // B.3 — prioridad: notifsGeneradas (datos reales) > alertasDin > NOTIF_INIT
  useEffect(()=>{
    if(notifsGeneradas&&notifsGeneradas.length>0){
      setNotifs(notifsGeneradas);
      return;
    }
    if(!alertasDin||alertasDin.length===0){
      setNotifs(NOTIF_INIT);
      return;
    }
    setNotifs(alertasDin.map((a,i)=>({
      id:"DIN"+i,
      tipo:a.lv==="critical"?"critico":a.lv==="warning"?"alerta":a.lv==="success"?"exito":"info",
      icono:a.lv==="critical"?"🔴":a.lv==="warning"?"🟡":a.lv==="success"?"🟢":"🔵",
      titulo:(a.tx||"Alerta del sistema").substring(0,60),
      cuerpo:a.tx||"",
      fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),
      leida:false,
      modulo:a.tag?.toLowerCase().replace("entregable","ejecucion").replace("cobro","facturacion").replace("horas","rrhh").replace("margen","rentabilidad").replace("plazo","ejecucion")||"dashboard"
    })));
  },[alertasDin]);
  const [filtTipo,setFiltTipo] = useState("todas");
  const [soloNoLeidas,setSoloNoLeidas] = useState(false);

  const TIPO_COL = {critico:"red",alerta:"amber",info:"blue",exito:"teal"};
  const TIPO_LBL = {critico:"Crítico",alerta:"Alerta",info:"Info",exito:"Éxito"};

  const marcarLeida  = (id) => setNotifs(prev=>prev.map(n=>n.id===id?{...n,leida:true}:n));
  const marcarTodas  = ()   => setNotifs(prev=>prev.map(n=>({...n,leida:true})));
  const eliminar     = (id) => setNotifs(prev=>prev.filter(n=>n.id!==id));

  const filtradas = notifs.filter(n=>{
    const mT = filtTipo==="todas"||n.tipo===filtTipo;
    const mL = !soloNoLeidas||!n.leida;
    return mT&&mL;
  });

  const noLeidas = notifs.filter(n=>!n.leida).length;

  return(
    <div>
      <div className="sh">
        <div>
          <div className="st">Notificaciones y Alertas</div>
          <div className="ss">{noLeidas} sin leer · {notifs.length} total</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--t2)",cursor:"pointer"}}>
            <input type="checkbox" checked={soloNoLeidas} onChange={e=>setSoloNoLeidas(e.target.checked)} style={{accentColor:C.blue}}/>
            Solo no leídas
          </label>
          <div style={{display:"flex",gap:6}}>
            {noLeidas>0&&<button className="btn btn-s btn-sm" onClick={marcarTodas}>✓ Marcar todas</button>}
            <button className="btn btn-r btn-sm" onClick={()=>setNotifs([])}>🗑 Limpiar</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Sin leer",  v:noLeidas,                                    col:noLeidas>0?"red":"teal"},
          {l:"Críticas",  v:notifs.filter(n=>n.tipo==="critico").length, col:"red"},
          {l:"Alertas",   v:notifs.filter(n=>n.tipo==="alerta").length,  col:"amber"},
          {l:"Informativas",v:notifs.filter(n=>n.tipo==="info").length,  col:"blue"},
          {l:"Éxitos",    v:notifs.filter(n=>n.tipo==="exito").length,   col:"teal"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      {/* Filtros por tipo */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {["todas","critico","alerta","info","exito"].map(t=>(
          <button key={t} onClick={()=>setFiltTipo(t)}
            style={{padding:"4px 12px",fontSize:11,fontWeight:600,borderRadius:10,border:"none",cursor:"pointer",
              background:filtTipo===t?(t==="todas"?C.navy:t==="critico"?C.red:t==="alerta"?C.amber:t==="info"?C.blue:C.teal):"var(--hv)",
              color:filtTipo===t?"#fff":"var(--t2)",transition:"all .15s"}}>
            {t==="todas"?"Todas":TIPO_LBL[t]}
            <span style={{marginLeft:5,fontSize:10,opacity:.8}}>({t==="todas"?notifs.length:notifs.filter(n=>n.tipo===t).length})</span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="card">
        {filtradas.length===0&&(
          <div style={{padding:"40px",textAlign:"center",color:"var(--t3)"}}>
            <div style={{fontSize:24,marginBottom:8}}>🔔</div>
            No hay notificaciones que mostrar
          </div>
        )}
        {filtradas.map(n=>(
          <div key={n.id} style={{display:"flex",gap:12,padding:"14px 16px",borderBottom:"1px solid var(--bd)",background:n.leida?"transparent":"rgba(74,159,212,.03)",transition:"background .2s"}}>
            {/* Indicador tipo */}
            <div style={{width:36,height:36,borderRadius:"50%",background:TIPO_COL[n.tipo]==="red"?"rgba(226,75,74,.1)":TIPO_COL[n.tipo]==="amber"?"rgba(186,117,23,.1)":TIPO_COL[n.tipo]==="blue"?"rgba(74,159,212,.1)":"rgba(29,158,117,.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>{n.icono}</div>

            {/* Contenido */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:3}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:13,fontWeight:n.leida?500:700,color:"var(--t1)"}}>{n.titulo}</span>
                  {!n.leida&&<div style={{width:7,height:7,borderRadius:"50%",background:C.blue,flexShrink:0}}/>}
                </div>
                <span className={"pill "+TIPO_COL[n.tipo]} style={{fontSize:9,flexShrink:0}}>{TIPO_LBL[n.tipo]}</span>
              </div>
              <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.5,marginBottom:6}}>{n.cuerpo}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:10,color:"var(--t3)"}}>{n.fecha}</span>
                {onNav&&<button className="btn btn-s btn-xs" onClick={()=>onNav(n.modulo)}>Ver módulo →</button>}
                {!n.leida&&<button className="btn btn-s btn-xs" onClick={()=>marcarLeida(n.id)}>✓ Marcar leída</button>}
                <button onClick={()=>eliminar(n.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--t3)",fontSize:11,padding:"2px 4px",marginLeft:"auto"}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Config alertas */}
      <div className="card" style={{marginTop:14}}>
        <div className="card-hd"><div className="ct">Configuración de alertas automáticas</div><div className="cs">El motor de alertas evalúa estas condiciones en tiempo real</div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {[
            {nivel:"Crítico",   col:C.red,   reglas:["Margen < 10%","Entregable atrasado > 5 días","Horas ejecutadas > 95%","Factura vencida sin cobro"]},
            {nivel:"Alerta",    col:C.amber, reglas:["Lead sin actividad > 7 días","Margen entre 10%-18%","Horas ejecutadas 80%-95%","Factura próxima a vencer (7d)"]},
            {nivel:"Info",      col:C.blue,  reglas:["Recursos confirmados en campo","Entregable subido al sistema","Pago recibido registrado","Nueva cotización creada"]},
            {nivel:"Éxito",     col:C.teal,  reglas:["Proyecto cerrado con margen > 22%","Fase completada en fecha","Propuesta aprobada","Cobro al 100% del proyecto"]},
          ].map((g,i)=>(
            <div key={i} style={{padding:"14px 16px",borderBottom:i<2?"1px solid var(--bd)":"none",borderRight:i%2===0?"1px solid var(--bd)":"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:g.col}}/>
                <span style={{fontSize:12,fontWeight:700,color:g.col}}>{g.nivel}</span>
              </div>
              {g.reglas.map((r,j)=>(
                <div key={j} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,fontSize:11,color:"var(--t2)"}}>
                  <div style={{width:4,height:4,borderRadius:"50%",background:g.col,flexShrink:0}}/>
                  {r}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// INTEGRACIONES EXTERNAS
// ==============================================================================
function Integraciones({toast,usuario}) {
  const canEdit = ["Admin"].includes(usuario.rol);
  const [estados,setEstados] = useState({
    sunat:    {activo:false,ult:"—",         config:{ruc:"",token:""}},
    whatsapp: {activo:false,ult:"—",         config:{numero:"",apiKey:""}},
    calendar: {activo:false,ult:"—",         config:{email:"",calId:""}},
    excel:    {activo:true, ult:"03/04/2026",config:{ruta:"",formato:"xlsx"}},
  });
  const [modalConf,setModalConf] = useState(null);
  const [formConf,setFormConf]   = useState({});
  const [testLoad,setTestLoad]   = useState(null);

  const toggleInteg = (key) => {
    if(!canEdit){toast("Solo Admin puede modificar integraciones","error");return;}
    setEstados(prev=>({...prev,[key]:{...prev[key],activo:!prev[key].activo}}));
    const nuevo = !estados[key].activo;
    toast(nuevo?"✓ Integración activada":"Integración desactivada",nuevo?"success":"warning");
  };

  const testInteg = async (key) => {
    setTestLoad(key);
    await new Promise(r=>setTimeout(r,1500));
    setTestLoad(null);
    if(key==="excel") toast("✓ Exportación Excel funcionando correctamente","success");
    else if(!estados[key].activo) toast("⚠ Activa la integración primero","warning");
    else toast("✓ Conexión exitosa con "+INTEG_DATA[key].nom,"success");
  };

  const abrirConf = (key) => {
    setFormConf({...estados[key].config});
    setModalConf(key);
  };

  const guardarConf = () => {
    setEstados(prev=>({...prev,[modalConf]:{...prev[modalConf],config:formConf}}));
    toast("✓ Configuración guardada","success");
    setModalConf(null);
  };

  const INTEG_DATA = {
    sunat:{
      nom:"SUNAT API",
      desc:"Consulta automática de datos de empresa por RUC. Autocompleta nombre, dirección y estado del contribuyente al crear leads o cotizaciones.",
      logo:"🏛️", color:C.navy,
      beneficios:["Autocomplete RUC al crear lead","Validación estado contribuyente","Importar razón social y dirección","Consulta en tiempo real"],
      campos:[{k:"ruc",lbl:"RUC de Aquarius",ph:"20100XXXXXX"},{k:"token",lbl:"Token API SUNAT",ph:"Bearer xxxxxxxx"}],
      badge:"Beta",
    },
    whatsapp:{
      nom:"WhatsApp Business",
      desc:"Envío automático de recordatorios de cobro, alertas de vencimiento y notificaciones a clientes vía WhatsApp Business API.",
      logo:"📱", color:C.teal,
      beneficios:["Recordatorio de cobro automático","Alerta de vencimiento de factura","Notificación de avance de proyecto","Confirmación de entregables"],
      campos:[{k:"numero",lbl:"Número WhatsApp Business",ph:"+51 9XX XXX XXX"},{k:"apiKey",lbl:"API Key (Meta Business)",ph:"EAAxxxxxxx"}],
      badge:"Próximamente",
    },
    calendar:{
      nom:"Google Calendar",
      desc:"Sincronización de hitos, fechas de entrega y reuniones con Google Calendar del equipo. Crea eventos automáticamente al programar actividades.",
      logo:"📅", color:C.blue,
      beneficios:["Crear evento al registrar actividad CRM","Sincronizar fechas de entregables","Alertas de reuniones con clientes","Vista de disponibilidad del equipo"],
      campos:[{k:"email",lbl:"Email Google Workspace",ph:"wilmer@nexova.pe"},{k:"calId",lbl:"Calendar ID",ph:"primary"}],
      badge:"Próximamente",
    },
    excel:{
      nom:"Exportación Excel / XML",
      desc:"Exportación nativa de cotizaciones, reportes y datos contables a formato Excel (.xlsx) y XML compatible con sistemas contables.",
      logo:"📊", color:C.purple,
      beneficios:["Exportar cotizaciones a Excel","Generar XML para sistema contable","Exportar reporte de proyectos","Backup automático de datos"],
      campos:[{k:"ruta",lbl:"Ruta de exportación",ph:"C:/Aquarius/Exportaciones"},{k:"formato",lbl:"Formato",ph:"xlsx"}],
      badge:"Activo",
    },
  };

  return(
    <div>
      {/* Modal configuración */}
      {modalConf&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={e=>{if(e.target===e.currentTarget)setModalConf(null);}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:440,boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:14,fontWeight:700}}>{INTEG_DATA[modalConf]?.logo} {INTEG_DATA[modalConf]?.nom}</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Configuración de integración</div></div>
              <button onClick={()=>setModalConf(null)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"var(--t3)"}}>×</button>
            </div>
            <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:12}}>
              {INTEG_DATA[modalConf]?.campos.map(c=>(
                <div key={c.k}>
                  <label className="fl">{c.lbl}</label>
                  <input value={formConf[c.k]||""} onChange={e=>setFormConf(p=>({...p,[c.k]:e.target.value}))} placeholder={c.ph} type={c.k.toLowerCase().includes("token")||c.k.toLowerCase().includes("key")?"password":"text"}/>
                </div>
              ))}
              <div style={{padding:"10px 12px",background:"rgba(74,159,212,.06)",border:"1px solid rgba(74,159,212,.15)",borderRadius:"var(--r)",fontSize:11,color:C.blue}}>
                🔒 Las credenciales se almacenan de forma segura en el sistema.
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button className="btn btn-s btn-sm" onClick={()=>setModalConf(null)}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={guardarConf}>{I.check} Guardar configuración</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sh">
        <div><div className="st">Integraciones Externas</div><div className="ss">{Object.values(estados).filter(e=>e.activo).length} activas · {Object.keys(INTEG_DATA).length} disponibles</div></div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {l:"Integraciones activas",  v:Object.values(estados).filter(e=>e.activo).length,  col:"teal"},
          {l:"Disponibles",            v:Object.keys(INTEG_DATA).length,                      col:"blue"},
          {l:"En desarrollo",          v:2,                                                    col:"amber"},
          {l:"Últ. sincronización",    v:"Hoy 09:14",                                          col:"navy"},
        ].map((k,i)=><div key={i} className={`kpi ${k.col}`}><div className="kpi-l">{k.l}</div><div className="kpi-v mono">{k.v}</div></div>)}
      </div>

      {/* Tarjetas de integraciones */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {Object.entries(INTEG_DATA).map(([key,integ])=>{
          const est = estados[key];
          return(
            <div key={key} className="card" style={{borderTop:`3px solid ${est.activo?integ.color:"var(--bd)"}`,transition:"border-color .3s"}}>
              <div className="card-hd">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:40,height:40,borderRadius:"var(--r)",background:est.activo?integ.color+"15":"var(--hv)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{integ.logo}</div>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>{integ.nom}</span>
                      <span style={{fontSize:9,padding:"2px 7px",borderRadius:8,fontWeight:700,
                        background:integ.badge==="Activo"?"rgba(29,158,117,.12)":integ.badge==="Beta"?"rgba(74,159,212,.12)":"rgba(186,117,23,.12)",
                        color:integ.badge==="Activo"?C.teal:integ.badge==="Beta"?C.blue:C.amber}}>{integ.badge}</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--t3)",marginTop:1}}>Últ. sync: {est.ult}</div>
                  </div>
                </div>
                {canEdit&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <div onClick={()=>toggleInteg(key)}
                      style={{width:40,height:22,borderRadius:11,background:est.activo?C.teal:"var(--bd)",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                      <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:est.activo?20:2,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:est.activo?C.teal:"var(--t3)"}}>{est.activo?"ON":"OFF"}</span>
                  </div>
                )}
              </div>

              <div style={{padding:"0 16px 12px"}}>
                <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.6,marginBottom:12}}>{integ.desc}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
                  {integ.beneficios.map((b,i)=>(
                    <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"var(--hv)",border:"1px solid var(--bd)",color:"var(--t2)"}}>✓ {b}</span>
                  ))}
                </div>
                <div style={{display:"flex",gap:7}}>
                  {canEdit&&<button className="btn btn-s btn-sm" onClick={()=>abrirConf(key)}>⚙ Configurar</button>}
                  <button className="btn btn-s btn-sm" onClick={()=>testInteg(key)} disabled={testLoad===key}>
                    {testLoad===key
                      ? <span style={{display:"flex",alignItems:"center",gap:6}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:"spin 1s linear infinite"}}><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>Probando…</span>
                      : "▷ Probar conexión"
                    }
                  </button>
                  {est.activo&&key==="excel"&&(
                    <button className="btn btn-p btn-sm" onClick={()=>toast("✓ Exportación iniciada — revisa tu carpeta de descargas","success")}>
                      {I.dl} Exportar ahora
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guía de implementación */}
      <div className="card" style={{marginTop:14}}>
        <div className="card-hd"><div><div className="ct">Guía de implementación</div><div className="cs">Pasos para activar cada integración</div></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {[
            {nom:"SUNAT API",pasos:["Obtener credenciales en sunat.gob.pe","Ingresar RUC y token en Configurar","Activar el toggle y probar conexión","Al crear leads, buscar por RUC automáticamente"]},
            {nom:"WhatsApp Business",pasos:["Crear cuenta en Meta Business Suite","Generar API Key en developers.facebook.com","Ingresar número y API Key en Configurar","Activar y configurar plantillas de mensaje"]},
            {nom:"Google Calendar",pasos:["Habilitar Google Calendar API en console.cloud.google","Obtener credenciales OAuth2","Ingresar email y Calendar ID","Activar y sincronizar eventos del proyecto"]},
            {nom:"Excel / XML",pasos:["Ya activo — sin configuración adicional","Usar botón 'Exportar' en cada módulo","Los archivos se descargan automáticamente","Compatible con sistemas contables estándar"]},
          ].map((g,i)=>(
            <div key={i} style={{padding:"14px 16px",borderBottom:i<2?"1px solid var(--bd)":"none",borderRight:i%2===0?"1px solid var(--bd)":"none"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:8}}>{g.nom}</div>
              {g.pasos.map((p,j)=>(
                <div key={j} style={{display:"flex",gap:8,marginBottom:5,alignItems:"flex-start"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(74,159,212,.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:C.blue}}>{j+1}</div>
                  <span style={{fontSize:11,color:"var(--t2)",lineHeight:1.5}}>{p}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// CONFIGURACIÓN — con agregar/editar usuarios
// ==============================================================================
const MODULOS_ALL=["Dashboard","CRM","Rentabilidad","Recursos","Ejecución","Presupuesto","Reportes","Config"];
const TARIFAS_DEFAULT=[
  {cargo:"Jefe Soporte",tarifa:10.48},
  {cargo:"Consultor Senior",tarifa:8.40},
  {cargo:"Supervisor",tarifa:5.72},
  {cargo:"Asistente Contable",tarifa:5.72},
  {cargo:"Asistente Mina",tarifa:0.53},
];

function Configuracion({usuarios, setUsuarios, toast, tarifas:tarifasGlobal, setTarifas:setTarifasGlobal, sysConfig, setSysConfig}) {
  const [tab,setTab]=useState("usuarios");
  const [modalNuevo,setModalNuevo]=useState(false);
  const [modalElim,setModalElim]=useState(null); // {id,nombre}
  const [form,setForm]=useState({nombre:"",email:"",password:"",rol:"Consultor",activo:true});
  const [formErr,setFormErr]=useState("");
  const [permisos,setPermisos]=useState({
    Admin:["Dashboard","CRM","Rentabilidad","Recursos","Ejecución","Presupuesto","Reportes","Config"],
    Comercial:["Dashboard","CRM","Rentabilidad"],
    Gerencia:["Dashboard","CRM","Ejecución","Presupuesto","Reportes"],
    "Jefe Proyecto":["Dashboard","Ejecución","Presupuesto","Recursos"],
    Consultor:["Ejecución"],
    Operaciones:["Recursos","Ejecución"],
    RRHH:["Recursos"],
  });
  const tarifas = tarifasGlobal && tarifasGlobal.length>0 ? tarifasGlobal : TARIFAS_OFICIALES;
  const setTarifas = (v) => { setTarifasGlobal&&setTarifasGlobal(v); };
  const [tarifasGuardadas,setTarifasGuardadas]=useState(false);
  const margenObj = sysConfig?.margenObj||30;
  const setMargenObj = (v) => setSysConfig&&setSysConfig(prev=>({...prev,margenObj:v}));
  const tcGlobal = sysConfig?.tc||3.60;
  const setTcGlobal = (v) => setSysConfig&&setSysConfig(prev=>({...prev,tc:v}));

  const toggleMod=(rol,mod)=>{
    setPermisos(prev=>{
      const cur=prev[rol]||[];
      return {...prev,[rol]:cur.includes(mod)?cur.filter(m=>m!==mod):[...cur,mod]};
    });
  };
  const nuevoRol=()=>{
    const nombre=window.prompt("Nombre del nuevo rol:");
    if(!nombre||!nombre.trim())return;
    const n=nombre.trim();
    if(permisos[n]){toast("Ese rol ya existe","error");return;}
    setPermisos(prev=>({...prev,[n]:[]}));
    toast(`✓ Rol "${n}" creado`,"success");
  };

  const agregarUsuario = () => {
    setFormErr("");
    if (!form.nombre.trim())    { setFormErr("El nombre es obligatorio.");           return; }
    if (!form.email.includes("@")){ setFormErr("Email inválido.");                    return; }
    if (!form.password||form.password.length<6){ setFormErr("Contraseña mínimo 6 caracteres."); return; }
    if (usuarios.find(u=>u.email.toLowerCase()===form.email.toLowerCase())) { setFormErr("Email ya registrado."); return; }
    const av=initials(form.nombre);
    const col=AVATAR_COLORS[usuarios.length%AVATAR_COLORS.length];
    setUsuarios(prev=>[...prev,{id:Math.max(...prev.map(u=>u.id))+1,nombre:form.nombre.trim(),email:form.email.trim().toLowerCase(),password:form.password,rol:form.rol,activo:form.activo,avatar:av,color:col}]);
    toast(`✓ Usuario ${form.nombre} creado`,"success");
    setModalNuevo(false);
    setForm({nombre:"",email:"",password:"",rol:"Consultor",activo:true});
  };
  const toggleActivo=(id)=>{setUsuarios(prev=>prev.map(u=>u.id===id?{...u,activo:!u.activo}:u));toast("Estado actualizado","success");};
  const eliminarUsuario=(id)=>{setUsuarios(prev=>prev.filter(u=>u.id!==id));toast("Usuario eliminado","success");setModalElim(null);};
  const updTarifa=(cargo,field,val)=>setTarifas(prev=>prev.map(t=>{
    if(t.cargo!==cargo) return t;
    const v=parseFloat(val)||0;
    if(field==="usd") return {...t,usd:v,soles:parseFloat((v*3.6).toFixed(2))};
    if(field==="soles") return {...t,soles:v,usd:parseFloat((v/3.6).toFixed(2))};
    return {...t,[field]:v};
  }));

  return(
    <div>
      {/* MODAL NUEVO USUARIO */}
      {modalNuevo&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setModalNuevo(false)}>
          <div className="modal">
            <div className="modal-hd">
              <div><div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Agregar nuevo usuario</div><div style={{fontSize:11,color:"var(--t3)",marginTop:2}}>Nexova CRM Pro</div></div>
              <button className="btn btn-s btn-xs" onClick={()=>setModalNuevo(false)}>{I.x}</button>
            </div>
            <div className="modal-bd">
              {formErr&&<div style={{background:"rgba(226,75,74,.1)",border:"1px solid rgba(226,75,74,.25)",borderRadius:"var(--r)",padding:"8px 12px",color:C.red,fontSize:12,marginBottom:14}}>{formErr}</div>}
              <div className="fg"><label className="fl">Nombre completo</label><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Juan Pérez"/></div>
              <div className="fg"><label className="fl">Correo electrónico</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="usuario@aquariusconsulting.com.pe"/></div>
              <div className="fg"><label className="fl">Contraseña</label><input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres"/></div>
              <div className="fg2">
                <div className="fg"><label className="fl">Rol</label><select value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}>{Object.keys(permisos).map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div className="fg"><label className="fl">Estado</label><select value={form.activo?"activo":"inactivo"} onChange={e=>setForm(f=>({...f,activo:e.target.value==="activo"}))}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
              </div>
              {form.nombre&&(<div style={{background:"var(--hv)",borderRadius:"var(--r)",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,marginTop:4}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:AVATAR_COLORS[usuarios.length%AVATAR_COLORS.length],color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{initials(form.nombre)}</div>
                <div><div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{form.nombre}</div><div style={{fontSize:11,color:"var(--t3)"}}>{form.rol} · {form.activo?"Activo":"Inactivo"}</div></div>
              </div>)}
            </div>
            <div className="modal-ft">
              <button className="btn btn-s" onClick={()=>setModalNuevo(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={agregarUsuario}>{I.usr} Crear usuario</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {modalElim&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",padding:24,width:360,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
            <div style={{fontSize:16,fontWeight:700,color:C.red,marginBottom:8}}>Eliminar usuario</div>
            <div style={{fontSize:13,color:"var(--t2)",marginBottom:20}}>¿Estás seguro de que deseas eliminar a <strong>{modalElim.nombre}</strong>? Esta acción no se puede deshacer.</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button className="btn btn-s btn-sm" onClick={()=>setModalElim(null)}>Cancelar</button>
              <button className="btn btn-r btn-sm" onClick={()=>eliminarUsuario(modalElim.id)}>{I.trash} Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="sh"><div><div className="st">Configuración</div></div></div>
      <Tabs tabs={[{id:"usuarios",lbl:"Usuarios"},{id:"roles",lbl:"Roles y permisos"},{id:"tarifas",lbl:"Tarifas personal"},{id:"params",lbl:"Parámetros"},{id:"acerca",lbl:"ℹ️ Acerca de"}]} active={tab} onChange={setTab}/>

      {tab==="usuarios"&&(
        <div className="card">
          <div className="card-hd">
            <div><div className="ct">Usuarios del Sistema</div><div className="cs">{usuarios.filter(u=>u.activo).length} activos · {usuarios.length} total</div></div>
            <button className="btn btn-p btn-sm" onClick={()=>setModalNuevo(true)}>{I.plus} Agregar usuario</button>
          </div>
          {usuarios.map(u=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:"1px solid var(--bd)"}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:u.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--t1)"}}>{u.nombre}</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>{u.email}</div>
              </div>
              <span className="pill blue">{u.rol}</span>
              <span className={`pill ${u.activo?"teal":"navy"}`}>{u.activo?"Activo":"Inactivo"}</span>
              <button className={`btn btn-sm ${u.activo?"btn-r":"btn-g"}`} onClick={()=>toggleActivo(u.id)}>{u.activo?"Desactivar":"Activar"}</button>
              <button className="btn btn-r btn-sm" onClick={()=>setModalElim({id:u.id,nombre:u.nombre})} title="Eliminar usuario">{I.trash}</button>
            </div>
          ))}
        </div>
      )}

      {tab==="roles"&&(
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
            <button className="btn btn-p btn-sm" onClick={nuevoRol}>{I.plus} Nuevo rol</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {Object.entries(permisos).map(([rol,mods])=>(
              <div key={rol} className="card">
                <div className="card-hd">
                  <div className="ct">{rol}</div>
                  <span style={{fontSize:10,color:"var(--t3)"}}>{mods.length} módulos</span>
                </div>
                <div className="cb">
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {MODULOS_ALL.map(mod=>{
                      const on=mods.includes(mod);
                      return(
                        <button key={mod} onClick={()=>toggleMod(rol,mod)} style={{padding:"3px 10px",fontSize:11,fontWeight:600,borderRadius:4,border:`1px solid ${on?C.teal:C.blue+"40"}`,background:on?C.teal+"20":"transparent",color:on?C.teal:"var(--t3)",cursor:"pointer",transition:"all .15s"}}>
                          {on?"✓ ":""}{mod}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{marginTop:10,fontSize:10,color:"var(--t3)"}}>Haz clic para activar o desactivar módulos</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
            <button className="btn btn-g btn-sm" onClick={()=>toast("✓ Permisos de roles guardados","success")}>{I.check} Guardar cambios de roles</button>
          </div>
        </div>
      )}

      {tab==="tarifas"&&(
        <div className="card">
          <div className="card-hd">
            <div><div className="ct">Tarifas de Personal</div><div className="cs">Tarifa base USD/hora por cargo — usada en calculadora de cotizaciones</div></div>
            {tarifasGuardadas&&<span style={{fontSize:11,color:C.teal,fontWeight:600}}>✓ Guardadas</span>}
          </div>
          <table>
            <thead><tr style={{background:"var(--navy)"}}>
              <th style={{padding:"8px 10px",color:"#fff",textAlign:"left",fontWeight:600}}>Cargo</th>
              <th style={{padding:"8px 10px",color:"#fff",textAlign:"right",fontWeight:600}}>S/./hora</th>
              <th style={{padding:"8px 10px",color:"#fff",textAlign:"right",fontWeight:600}}>USD/hora</th>
              <th style={{padding:"8px 10px",color:"#fff",textAlign:"right",fontWeight:600}}>Ref. mensual (160h)</th>
            </tr></thead>
            <tbody>
              {tarifas.map((t,i)=>(
                <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                  <td style={{padding:"7px 10px",fontWeight:600,color:"var(--t1)"}}>{t.cargo}</td>
                  <td style={{padding:"4px 6px",textAlign:"right"}}>
                    <input type="number" value={t.soles||""} step={0.01} min={0}
                      onChange={e=>updTarifa(t.cargo,"soles",e.target.value)}
                      style={{width:80,padding:"3px 6px",fontSize:11,textAlign:"right",fontFamily:"var(--mono)"}}/>
                  </td>
                  <td style={{padding:"4px 6px",textAlign:"right"}}>
                    <input type="number" value={t.usd||""} step={0.01} min={0}
                      onChange={e=>updTarifa(t.cargo,"usd",e.target.value)}
                      style={{width:72,padding:"3px 6px",fontSize:11,textAlign:"right",fontFamily:"var(--mono)",fontWeight:700,color:C.blue,border:"1px solid "+C.blue+"40"}}/>
                  </td>
                  <td className="mono" style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:C.teal}}>{"$"}{((t.usd||0)*160).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid var(--bd)"}}>
            <span style={{fontSize:11,color:"var(--t3)"}}>Tipo de cambio S/3.60 · Cambios reflejan en Cotizaciones automáticamente</span>
            <button className="btn btn-p btn-sm" onClick={()=>{setTarifasGuardadas(true);toast("✓ Tarifas guardadas y sincronizadas en todos los módulos","success");}}>{I.check} Guardar tarifas</button>
          </div>
        </div>
      )}

      {tab==="parametros"&&(
        <div id="config-params" data-tour="config-params" className="card" style={{padding:24}}>
          <div className="card-hd" style={{marginBottom:20}}>
            <div><div className="ct">Parámetros del Sistema</div><div className="cs">Configuración global para cotizaciones y cálculos</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:600}}>
            <div>
              <label className="fl">Margen objetivo (%)</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <input type="range" min="10" max="50" step="0.5" value={margenObj}
                  onChange={e=>setMargenObj(parseFloat(e.target.value))}
                  style={{flex:1,accentColor:"#0F766E"}}/>
                <span className="mono" style={{fontSize:18,fontWeight:800,color:"#0F766E",minWidth:48}}>{margenObj}%</span>
              </div>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>ISO 9001 recomienda ≥ 30%</div>
            </div>
            <div>
              <label className="fl">Tipo de cambio (S/. por USD)</label>
              <input type="number" step="0.01" min="1" max="10" value={tcGlobal}
                onChange={e=>setTcGlobal(parseFloat(e.target.value)||3.60)}
                style={{fontFamily:"monospace",fontSize:16,fontWeight:700}}/>
              <div style={{fontSize:11,color:"var(--t3)",marginTop:4}}>Usado en cálculos de rentabilidad</div>
            </div>
          </div>
          <div style={{marginTop:24,padding:"14px 16px",background:"rgba(15,118,110,.06)",borderRadius:8,border:"1px solid rgba(15,118,110,.15)"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#0F766E",marginBottom:8}}>Reglas de semáforo de margen</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,fontSize:12}}>
              {[["🟢 Óptimo","≥ "+margenObj+"%","#166534"],["🔵 Aceptable","22–"+(margenObj-1)+"%","#1e40af"],["🟡 Bajo","15–21%","#92400e"],["🔴 Crítico","< 15%","#991b1b"]].map(([lbl,rng,col],i)=>(
                <div key={i} style={{padding:"8px 10px",background:col+"12",borderRadius:6,border:"1px solid "+col+"25"}}>
                  <div style={{fontWeight:700,color:col,marginBottom:2}}>{lbl}</div>
                  <div style={{color:"var(--t2)"}}>{rng}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{marginTop:16,display:"flex",gap:8}}>
            <button className="btn btn-p btn-sm" onClick={()=>{toast("✓ Parámetros guardados","success");}}>
              {I.check} Guardar parámetros
            </button>
            <button className="btn btn-s btn-sm" onClick={()=>{setMargenObj(30);setTcGlobal(3.60);toast("Parámetros restablecidos","info");}}>
              {I.reset} Restablecer
            </button>
          </div>
        </div>
      )}

      {tab==="params"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card"><div className="card-hd"><div className="ct">Parámetros Globales</div></div><div className="cb">
            {[["Tipo de cambio S/ / USD","3.72","number"],["Margen mínimo (%)","12","number"],["Margen objetivo (%)","22","number"],["Plazo estándar (semanas)","9","number"],["Número de fases estándar","9","number"]].map(([l,v,t],i)=>(
              <div key={i} style={{marginBottom:12}}><label className="fl">{l}</label><input type={t} defaultValue={v}/></div>
            ))}
            <button className="btn btn-g" style={{width:"100%",justifyContent:"center"}} onClick={()=>toast("Parámetros guardados","success")}>{I.check} Guardar cambios</button>
          </div></div>
          <div className="card"><div className="card-hd"><div className="ct">Términos técnicos protegidos</div><div className="cs">Estos términos no se traducen</div></div>
            <div className="cb">
              {["Pipeline","Dashboard","CRM","KPI","Score","Lead","Kanban","Win Rate","NIIF","SITIA","EPP","SCTR","AF (Activo Fijo)"].map((t,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--bd)"}}>
                  <span style={{fontSize:10,color:C.teal}}>✓</span>
                  <span style={{fontSize:12,fontFamily:"var(--mono)",fontWeight:600,color:C.blue}}>{t}</span>
                  <span style={{fontSize:10,color:"var(--t3)"}}>— protegido</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{marginTop:24,padding:"20px 24px",background:"#0F766E",borderRadius:"var(--r)",display:"flex",alignItems:"center",gap:20}}>
        <Logo s={48} bg={true}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800,color:"#fff",letterSpacing:1.5,marginBottom:2}}>NEXOVA</div>
          <div style={{fontSize:11,color:"rgba(13,148,136,.8)",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>SOFTWARE EMPRESARIAL</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.8}}>
            <span style={{color:"rgba(255,255,255,.8)",fontWeight:600}}>Nexova CRM Pro</span> v3.0 · Plataforma integral para gestión comercial, ejecución y control de proyectos y facturación y cobranzas.<br/>
            Desarrollado por <span style={{color:"rgba(13,148,136,.9)",fontWeight:700}}>Wilmer Moreno V.</span> · Jefe de Proyectos
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {[
            {ico:"🌐", txt:"nexova.pe"},
            {ico:"✉️",  txt:"wilmer@nexova.pe"},
            {ico:"📞", txt:"+51 949 287 897"},
            {ico:"📍", txt:"San Luis, Lima"},
          ].map((r,i)=>(
            <div key={i} style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:3,display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
              <span>{r.ico}</span><span>{r.txt}</span>
            </div>
          ))}
        </div>
      </div>
      {/* -- Tab Acerca de -- */}
      {tab==="acerca"&&(
        <div style={{maxWidth:640,margin:"0 auto"}}>
          {/* Card principal */}
          <div style={{background:"linear-gradient(135deg,#0F766E,#1E293B)",borderRadius:12,padding:32,
            display:"flex",gap:24,alignItems:"center",marginBottom:16,color:"#fff"}}>
            {/* Logo */}
            <div style={{width:72,height:72,background:"rgba(255,255,255,.15)",borderRadius:14,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <polygon points="22,4 38,13 38,31 22,40 6,31 6,13" fill="none" stroke="#fff" strokeWidth="1.8"/>
                {[0,1,2,3,4,5].map(i=>{
                  const a=i*60*Math.PI/180;
                  const x=22+18*Math.cos(a-Math.PI/2);
                  const y=22+18*Math.sin(a-Math.PI/2);
                  return <circle key={i} cx={x} cy={y} r="2.5" fill="#fff"/>;
                })}
                <text x="22" y="26" textAnchor="middle" fontSize="14" fontWeight="300" fill="#fff" fontFamily="Sora,sans-serif">N</text>
              </svg>
            </div>
            <div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:900,letterSpacing:2,marginBottom:4}}>NEXOVA</div>
              <div style={{fontSize:11,letterSpacing:3,color:"rgba(255,255,255,.7)",textTransform:"uppercase",marginBottom:8}}>Software Empresarial</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.9)",fontWeight:500}}>Nexova CRM Pro v3.0</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:2}}>Plataforma integral para gestión comercial, ejecución y control de proyectos</div>
            </div>
          </div>

          {/* Info del desarrollador */}
          <div className="card" style={{padding:20,marginBottom:12}}>
            <div className="ct" style={{marginBottom:12}}>Desarrollado por</div>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:"#0F766E",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>WM</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--t1)"}}>Wilmer Moreno V.</div>
                <div style={{fontSize:12,color:"var(--t2)"}}>Arquitecto de Software · Nexova</div>
                <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}>
                  {[["🌐","nexova.pe"],["✉️","wilmer@nexova.pe"],["📞","+51 949 287 897"],["📍","Jr. Álava 268, San Luis, Lima"]].map(([ico,txt],i)=>(
                    <div key={i} style={{fontSize:11,color:"var(--t3)",display:"flex",gap:4,alignItems:"center"}}>
                      <span>{ico}</span><span>{txt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stack técnico */}
          <div className="card" style={{padding:20,marginBottom:12}}>
            <div className="ct" style={{marginBottom:12}}>Stack técnico</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                ["Frontend","React 18 + Hooks"],
                ["Estilos","CSS puro con variables"],
                ["Gráficas","Recharts"],
                ["Persistencia","window.storage API"],
                ["IA integrada","Claude API (claude-sonnet-4-20250514)"],
                ["Íconos","SVG inline"],
              ].map(([k,v],i)=>(
                <div key={i} style={{padding:"8px 12px",background:"var(--hv)",borderRadius:6}}>
                  <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginBottom:2}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Módulos */}
          <div className="card" style={{padding:20}}>
            <div className="ct" style={{marginBottom:12}}>Módulos del sistema</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["CRM · Pipeline Comercial","Cotizaciones · Rentabilidad","Propuestas","Gestión de Recursos",
                "Ejecución · Gantt","Control Presupuestal","Carga de Inventario","Control de Calidad",
                "Facturación y Cobranzas","Reportes","RRHH","Manual de Usuario"].map((m,i)=>(
                <span key={i} style={{fontSize:11,padding:"3px 10px",borderRadius:10,
                  background:"rgba(13,148,136,.1)",color:"#0F766E",fontWeight:600}}>
                  {m}
                </span>
              ))}
            </div>
            <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--bd)",
              fontSize:11,color:"var(--t3)",textAlign:"center"}}>
              Nexova CRM Pro v3.0 · © 2026 Nexova · Todos los derechos reservados
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==============================================================================
// CHAT ASISTENTE IA
// ==============================================================================
function ChatAsistente({usuario, proyectos, leads}) {
  const [open,setOpen]       = useState(false);
  const [msgs,setMsgs]       = useState([{role:"assistant",content:`¡Hola, ${usuario.nombre.split(" ")[0]}! Soy el asistente de Nexova CRM Pro. Puedo ayudarte a navegar el sistema, explicarte cómo usar cualquier módulo o responder dudas sobre tus proyectos. ¿En qué te ayudo?`}]);
  const [input,setInput]     = useState("");
  const [loading,setLoading] = useState(false);
  const [unread,setUnread]   = useState(0);
  const bottomRef            = useRef(null);
  const inputRef             = useRef(null);

  const SUGS = [
    "¿Cómo creo una cotización?",
    "¿Dónde veo el avance de SIMSA?",
    "¿Cómo registro una actividad en un lead?",
    "¿Qué módulos tengo disponibles?",
  ];

  const SYSTEM = `Eres el asistente de Nexova CRM Pro para NEXOVA\n\nUSUARIO: ${usuario.nombre} | Rol: ${usuario.rol}\nMÓDULOS ACCESIBLES: ${(ACCESO_ROL[usuario.rol]||[]).join(", ")}\n\nMÓDULOS: Dashboard=KPIs y alertas | CRM=Leads y Pipeline | Rentabilidad=Cotizaciones | Recursos=Asignación personal/EPP | Ejecución=Proyectos y Gantt | Presupuesto=Real vs Cotizado | Reportes=8 reportes | Config=Solo Admin\n\nPROYECTOS: ${(proyectos||[]).map(p=>p.id+"/"+p.cliente+" $"+p.valor+" "+p.avance+"%").join(" | ")}\n\nLEADS: ${Object.entries(leads||{}).map(([s,a])=>(a||[]).map(l=>l.co+"("+s+")").join(",")).join(",")}\n\nResponde en español, conciso. Si el ROL no tiene acceso a algo, explícalo y sugiere contactar a Wilmer Moreno (Admin). Máximo 3-4 párrafos.`;

  useEffect(()=>{
    if(open){ setUnread(0); setTimeout(()=>inputRef.current?.focus(),150); }
  },[open]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs]);

  const enviar = async (texto) => {
    const txt=(texto||input).trim();
    if(!txt||loading) return;
    setInput("");
    const newMsgs=[...msgs,{role:"user",content:txt}];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:600,
          system:SYSTEM,
          messages:newMsgs.map(m=>({role:m.role,content:m.content})),
        })
      });
      const data = await resp.json();
      const reply = data.content?.[0]?.text || "No pude procesar la respuesta. Intenta de nuevo.";
      setMsgs(p=>[...p,{role:"assistant",content:reply}]);
      if(!open) setUnread(n=>n+1);
    } catch {
      setMsgs(p=>[...p,{role:"assistant",content:"⚠️ Error de conexión. Intenta de nuevo."}]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{position:"fixed",bottom:22,right:22,zIndex:8000,width:50,height:50,borderRadius:"50%",background:open?"#1E293B":C.blue,border:`2px solid ${open?"rgba(74,159,212,.4)":"rgba(255,255,255,.2)"}`,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,.25)",transition:"all .2s"}}
        title="Asistente Nexova IA"
      >
        {open
          ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        }
        {unread>0&&!open&&(
          <div style={{position:"absolute",top:-3,right:-3,width:18,height:18,borderRadius:"50%",background:C.red,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{unread}</div>
        )}
      </button>
      {open&&(
        <div style={{position:"fixed",bottom:82,right:22,zIndex:7999,width:360,height:520,background:"var(--card)",border:"1px solid var(--bd)",borderRadius:12,boxShadow:"0 12px 40px rgba(0,0,0,.2)",display:"flex",flexDirection:"column",overflow:"hidden",animation:"chatIn .2s ease"}}>
          <div style={{padding:"12px 14px",background:C.navy,display:"flex",alignItems:"center",gap:10,flexShrink:0,borderBottom:"1px solid rgba(74,159,212,.2)"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Asistente Nexova</div>
              <div style={{fontSize:10,color:"rgba(74,159,212,.8)"}}>IA · Siempre disponible</div>
            </div>
            <button onClick={()=>setMsgs([{role:"assistant",content:`Conversación reiniciada. ¿En qué te ayudo, ${usuario.nombre.split(" ")[0]}?`}])} title="Nueva conversación" style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.35)",padding:4,display:"flex"}}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>
            </button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
                {m.role==="assistant"&&(
                  <div style={{width:26,height:26,borderRadius:"50%",background:C.blue+"20",border:`1px solid ${C.blue}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>
                  </div>
                )}
                <div style={{maxWidth:"82%",padding:"9px 11px",borderRadius:m.role==="user"?"10px 10px 2px 10px":"10px 10px 10px 2px",background:m.role==="user"?C.blue:"var(--hv)",border:m.role==="user"?"none":"1px solid var(--bd)",color:m.role==="user"?"#fff":"var(--t1)",fontSize:12,lineHeight:1.55,whiteSpace:"pre-wrap"}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading&&(
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:26,height:26,borderRadius:"50%",background:C.blue+"20",border:`1px solid ${C.blue}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.blue} strokeWidth="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/></svg>
                </div>
                <div style={{padding:"10px 14px",background:"var(--hv)",border:"1px solid var(--bd)",borderRadius:"10px 10px 10px 2px",display:"flex",gap:5,alignItems:"center"}}>
                  {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.blue,opacity:.5,animation:`dot .7s ease-in-out ${i*.2}s infinite alternate`}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          {msgs.length<=1&&(
            <div style={{padding:"0 12px 10px",display:"flex",flexWrap:"wrap",gap:5}}>
              {SUGS.map((s,i)=>(
                <button key={i} onClick={()=>enviar(s)}
                  style={{fontSize:10,padding:"4px 9px",borderRadius:12,background:"var(--bg)",border:"1px solid var(--bd)",color:"var(--t2)",cursor:"pointer",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";e.currentTarget.style.color="var(--t2)";}}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div style={{padding:"10px 12px",borderTop:"1px solid var(--bd)",display:"flex",gap:8,flexShrink:0,background:"var(--card)"}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder="Pregunta algo sobre el sistema…" style={{flex:1,fontSize:12,padding:"7px 10px",borderRadius:8}} disabled={loading}/>
            <button onClick={()=>enviar()} disabled={!input.trim()||loading} style={{width:34,height:34,borderRadius:8,flexShrink:0,background:input.trim()&&!loading?C.blue:"var(--bd)",border:"none",color:"#fff",cursor:input.trim()&&!loading?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .15s"}}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>
            </button>
          </div>
          <div style={{padding:"5px 12px 8px",textAlign:"center",fontSize:9,color:"var(--t3)"}}>
            Rol activo: <strong style={{color:"var(--t2)"}}>{usuario.rol}</strong> · Powered by Claude API
          </div>
        </div>
      )}
    </>
  );
}

// ==============================================================================
// APP SHELL
// ==============================================================================
// ==============================================================================
// GESTIÓN DE RECURSOS — Módulo unificado: Recursos en campo + Requerimientos
// ==============================================================================
// ==============================================================================
// MÓDULO CARGA DE INVENTARIO
// ==============================================================================
// ==============================================================================
// IMPORTACIÓN DE LEADS HISTÓRICOS
// ==============================================================================
function ImportLeads({leads, setLeads, toast, usuario}) {
  const [step,      setStep]      = useState("inicio");  // inicio|preview|done
  const [fileName,  setFileName]  = useState("");
  const [preview,   setPreview]   = useState([]);  // leads parseados
  const [errores,   setErrores]   = useState([]);
  const [importing, setImporting] = useState(false);

  const ETAPAS_VALIDAS = ["prospecto","calificado","propuesta","negociacion","ganado"];
  const SECTORES       = ["Minería","Industrial","Retail","Servicios","Energía","Construcción","Financiero","Otro"];

  // -- Descargar plantilla Excel ----------------------------------------------
  const descargarPlantilla = async () => {
    try {
      // Cargar SheetJS si no está disponible
      if(!window.XLSX){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload=res; s.onerror=()=>rej(new Error("No se pudo cargar SheetJS"));
          document.head.appendChild(s);
        });
      }
      const XLSX = window.XLSX;
      const wb = XLSX.utils.book_new();

      // ── Definir columnas ──────────────────────────────────────
      const COLS = [
        {key:"empresa",          lbl:"Empresa / Cliente",         w:30, req:true,  ej:"Minera Los Andes S.A."},
        {key:"contacto",         lbl:"Nombre del Contacto",       w:25, req:true,  ej:"Ing. Carlos Rivas"},
        {key:"cargo_contacto",   lbl:"Cargo del Contacto",        w:22, req:false, ej:"Gerente de Activos"},
        {key:"valor_usd",        lbl:"Valor Estimado (USD)",       w:18, req:true,  ej:"35000"},
        {key:"sector",           lbl:"Sector",                    w:16, req:false, ej:"Minería"},
        {key:"etapa",            lbl:"Etapa del Pipeline",        w:18, req:false, ej:"prospecto"},
        {key:"probabilidad",     lbl:"Probabilidad %",            w:15, req:false, ej:"60"},
        {key:"fecha_ultimo_contacto",lbl:"Fecha Último Contacto", w:22, req:false, ej:"15/03/2026"},
        {key:"tags",             lbl:"Tags (separados por coma)", w:25, req:false, ej:"NIIF 13,Inventario"},
        {key:"notas",            lbl:"Notas / Observaciones",     w:40, req:false, ej:"Plantas en Arequipa. Interesados en valuación."},
        {key:"actividades",      lbl:"Actividades Realizadas",    w:40, req:false, ej:"Llamada inicial 15 Mar - Reunión pendiente"},
      ];

      // ── Filas de datos de ejemplo ─────────────────────────────
      const EJEMPLOS = [
        ["Minera Los Andes S.A.","Ing. Carlos Rivas","Gerente de Activos","35000","Minería","prospecto","60","15/03/2026","NIIF 13,Inventario","Plantas en Arequipa y Puno. Interesados en valuación.","Llamada inicial 15 Mar"],
        ["Grupo Falcón Corp","Dra. María López","CFO","82000","Industrial","calificado","75","20/03/2026","NIIF 16","Conciliación AF 3 plantas. Presupuesto aprobado.","Reunión presencial 20 Mar"],
        ["Retail Express Perú","Sr. Jorge Méndez","Jefe de Contabilidad","18500","Retail","propuesta","80","01/04/2026","Inventario","Red de 8 tiendas Lima. Cierre esperado mayo.","Propuesta enviada 01 Abr"],
        ["Banco Continental","CPC. Ana Torres","Gerente Financiero","55000","Financiero","negociacion","90","02/04/2026","Valuación,NIIF 13","Cartera inmuebles Lima. Urgente Q2 2026.","Negociación contrato 02 Abr"],
        ["Cementos Sur S.A.","Ing. Pedro Salas","VP Operaciones","28000","Industrial","ganado","100","23/03/2026","Inventario","Proyecto iniciado. 9 semanas plazo.","Contrato firmado 23 Mar"],
      ];

      // ── Construir hoja ────────────────────────────────────────
      const aoa = [];
      // Fila 1: título
      const titulo = ["PLANTILLA DE CARGA DE LEADS — Nexova CRM Pro", ...Array(COLS.length-1).fill("")];
      aoa.push(titulo);
      // Fila 2: subtítulo instrucciones
      const subtit = ["Completa desde la fila 4. Campos con * son obligatorios. Etapas válidas: prospecto, calificado, propuesta, negociacion, ganado", ...Array(COLS.length-1).fill("")];
      aoa.push(subtit);
      // Fila 3: headers
      aoa.push(COLS.map(c => c.req ? c.lbl+" *" : c.lbl));
      // Filas 4-8: ejemplos
      EJEMPLOS.forEach(e => aoa.push(e));
      // Filas 9-28: vacías para rellenar
      for(let i=0;i<20;i++) aoa.push(COLS.map(()=>""));

      // Generar xlsx real con SheetJS
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = COLS.map(c=>({wch:c.w||20}));
      ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:COLS.length-1}},{s:{r:1,c:0},e:{r:1,c:COLS.length-1}}];
      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, "Plantilla_Carga_Leads_Nexova.xlsx");
      toast("✓ Plantilla .xlsx descargada","success");
    } catch(err){
      toast("Error generando plantilla: "+err.message,"error");
    }
  };

  // -- Parser de archivo ------------------------------------------------------
  const parsearArchivo = (file) => {
    setFileName(file.name);
    const isXlsx = file.name.endsWith(".xlsx")||file.name.endsWith(".xls");
    const reader = new FileReader();

    const procesarRows = (rawRows) => {
      const errs = [];
      const parsed = rawRows.filter(r=>r.empresa?.trim()).map((r,i)=>{
        const etapa = (r.etapa||r.stage||"prospecto").toLowerCase().trim();
        const etapaOk = ETAPAS_VALIDAS.includes(etapa) ? etapa : "prospecto";
        const val  = parseFloat((r.valor_usd||r.valor||r.value||"0").toString().replace(/[^0-9.]/g,""))||0;
        const prob = Math.min(100,Math.max(0,parseInt(r.probabilidad||r.prob||"50")||50));
        if(!r.empresa?.trim()) return null;
        if(!etapaOk) errs.push(`Fila ${i+2}: etapa "${r.etapa}" inválida → asignada como "prospecto"`);
        const tagsArr = (r.tags||"").split(",").map(t=>t.trim()).filter(Boolean);
        return {
          id:    "IMP-"+Date.now()+"-"+i,
          co:    (r.empresa||r.company||r.cliente||"").trim(),
          ct:    (r.contacto||r.contact||r.nombre||"").trim(),
          rol:   (r.cargo_contacto||r.cargo||r.role||"").trim(),
          val,
          score: prob,
          sec:   (r.sector||r.industry||"Otro").trim(),
          stage: etapaOk,
          last:  (r.fecha_ultimo_contacto||r.fecha||new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"})).trim(),
          prob,
          tags:  tagsArr,
          notes: (r.notas||r.notes||r.observaciones||"").trim(),
          acts:  (r.actividades||"").trim()
            ? [{t:"import",tx:(r.actividades||"").trim().substring(0,80),d:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"}),u:usuario.nombre.split(" ")[0]}]
            : [{t:"import",tx:"Importado desde histórico",d:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"short"}),u:usuario.nombre.split(" ")[0]}],
        };
      }).filter(Boolean);
      setPreview(parsed);
      setErrores(errs);
      setStep("preview");
    };

    if(isXlsx){
      reader.onload = async (e) => {
        try {
          if(!window.XLSX){
            await new Promise((res,rej)=>{
              const s=document.createElement("script");
              s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
              s.onload=res; s.onerror=()=>rej(new Error("No se pudo cargar SheetJS"));
              document.head.appendChild(s);
            });
          }
          const wb  = window.XLSX.read(new Uint8Array(e.target.result),{type:"array"});
          const ws  = wb.Sheets[wb.SheetNames[0]];
          const raw = window.XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});
          procesarRows(raw);
        } catch(err){ toast("Error: "+err.message,"error"); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n").filter(l=>l.trim());
        const sep = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(sep).map(h=>h.replace(/"/g,"").trim().toLowerCase());
        const rows = lines.slice(1).filter(l=>l.trim()).map(line=>{
          const vals = line.split(sep).map(v=>v.replace(/"/g,"").trim());
          return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||""]));
        });
        procesarRows(rows);
      };
      reader.readAsText(file,"UTF-8");
    }
  };

  // -- Confirmar importación --------------------------------------------------
  const confirmarImport = () => {
    setImporting(true);
    setTimeout(()=>{
      setLeads(prev=>{
        const nuevo = {...(prev||{})};
        preview.forEach(lead=>{
          const etapa = lead.stage||"prospecto";
          if(!nuevo[etapa]) nuevo[etapa]=[];
          // Evitar duplicados por empresa+contacto
          const dup = Object.values(nuevo).flat().find(l=>
            l.co.toLowerCase()===lead.co.toLowerCase() &&
            l.ct.toLowerCase()===lead.ct.toLowerCase()
          );
          if(!dup) nuevo[etapa]=[lead,...nuevo[etapa]];
        });
        return nuevo;
      });
      setImporting(false);
      setStep("done");
      toast(`✓ ${preview.length} leads importados al pipeline CRM`,"success");
    }, 600);
  };

  const ETAPA_COL = {prospecto:"#64748b",calificado:"#0D9488",propuesta:"#0284c7",negociacion:"#d97706",ganado:"#16a34a"};
  const fi = n=>Number(n||0).toLocaleString("es-PE");

  return (
    <div>
      <div className="sh">
        <div>
          <div className="st">Importación de Leads Históricos</div>
          <div className="ss">Carga masiva de leads al pipeline CRM con validación previa</div>
        </div>
      </div>

      {/* -- PASO 1: INICIO -- */}
      {step==="inicio"&&(
        <div style={{maxWidth:640,margin:"0 auto"}}>

          {/* Descargar plantilla */}
          <div className="card" style={{padding:20,marginBottom:14,border:"2px solid rgba(13,148,136,.2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:10,background:"rgba(13,148,136,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>📥</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"var(--t1)",marginBottom:2}}>Paso 1 — Descarga la plantilla</div>
                <div style={{fontSize:12,color:"var(--t3)"}}>CSV con las columnas correctas y filas de ejemplo para guiarte</div>
              </div>
              <button className="btn btn-p btn-sm" onClick={descargarPlantilla}>⬇ Descargar plantilla</button>
            </div>
          </div>

          {/* Zona de carga */}
          <div
            style={{border:"2px dashed var(--bd)",borderRadius:12,padding:40,textAlign:"center",
              background:"var(--hv)",cursor:"pointer",marginBottom:14}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#0D9488";}}
            onDragLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--bd)";const f=e.dataTransfer.files[0];if(f)parsearArchivo(f);}}
            onClick={()=>document.getElementById("leads-file-input").click()}
          >
            <div style={{fontSize:40,marginBottom:8}}>📂</div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--t1)",marginBottom:6}}>Paso 2 — Carga tu archivo</div>
            <div style={{fontSize:12,color:"var(--t3)"}}>Excel (.xlsx) o CSV · Arrastra o haz clic</div>
            <input id="leads-file-input" type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}}
              onChange={e=>{const f=e.target.files[0];if(f)parsearArchivo(f);e.target.value="";}}/>
          </div>

          {/* Columnas de la plantilla */}
          <div className="card" style={{padding:16,border:"1px solid var(--bd)",borderRadius:8}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:10}}>Columnas de la plantilla</div>
            <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--navy)",color:"#fff"}}>
                <th style={{padding:"6px 10px",textAlign:"left"}}>Columna</th>
                <th style={{padding:"6px 10px",textAlign:"left"}}>Descripción</th>
                <th style={{padding:"6px 10px",textAlign:"left"}}>Requerido</th>
              </tr></thead>
              <tbody>
                {[
                  ["empresa","Razón social del cliente","✅ Sí"],
                  ["contacto","Nombre del contacto principal","—"],
                  ["cargo_contacto","Cargo del contacto","—"],
                  ["valor_usd","Valor estimado del negocio en USD","—"],
                  ["sector","Minería / Industrial / Retail / Servicios / etc.","—"],
                  ["etapa","prospecto / calificado / propuesta / negociacion / ganado","—"],
                  ["probabilidad","0 a 100 (%)","—"],
                  ["fecha_ultimo_contacto","DD/MM/YYYY","—"],
                  ["tags","Etiquetas separadas por coma (NIIF 13, Inventario...)","—"],
                  ["notas","Observaciones del lead","—"],
                  ["actividades","Resumen de actividades previas","—"],
                ].map(([col,desc,req],i)=>(
                  <tr key={i} style={{background:i%2===0?"var(--hv)":"var(--card)"}}>
                    <td style={{padding:"5px 10px",fontFamily:"monospace",color:"#0D9488",fontWeight:700}}>{col}</td>
                    <td style={{padding:"5px 10px",color:"var(--t2)"}}>{desc}</td>
                    <td style={{padding:"5px 10px",textAlign:"center"}}>{req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -- PASO 2: PREVIEW -- */}
      {step==="preview"&&(
        <div>
          {/* Resumen */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
            {[
              {l:"Leads a importar", v:preview.length,                                      col:"teal"},
              {l:"Con errores/alertas",v:errores.length,                                    col:errores.length>0?"amber":"teal"},
              {l:"Valor total USD",  v:"$"+fi(preview.reduce((a,l)=>a+l.val,0)),           col:"blue"},
              {l:"Etapas detectadas",v:[...new Set(preview.map(l=>l.stage))].length+" etapas",col:"navy"},
            ].map((k,i)=>(
              <div key={i} className={`kpi ${k.col}`}>
                <div className="kpi-l">{k.l}</div>
                <div className="kpi-v mono">{k.v}</div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {errores.length>0&&(
            <div style={{padding:"10px 14px",background:"rgba(217,119,6,.08)",border:"1px solid rgba(217,119,6,.25)",borderRadius:8,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#d97706",marginBottom:4}}>⚠️ {errores.length} advertencia(s):</div>
              {errores.map((e,i)=><div key={i} style={{fontSize:11,color:"var(--t2)"}}>{e}</div>)}
            </div>
          )}

          {/* Tabla preview */}
          <div className="card" style={{marginBottom:14,overflow:"auto"}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700}}>Vista previa — {fileName}</div>
              <div style={{fontSize:11,color:"var(--t3)"}}>Se importarán {preview.length} leads al pipeline CRM</div>
            </div>
            <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--navy)",color:"#fff"}}>
                {["Empresa","Contacto / Cargo","Valor USD","Sector","Etapa","Prob.","Tags"].map((h,i)=>(
                  <th key={i} style={{padding:"7px 10px",textAlign:i>=2?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {preview.slice(0,20).map((l,i)=>(
                  <tr key={i} style={{background:i%2===0?"var(--hv)":"var(--card)",borderBottom:"1px solid var(--bd)"}}>
                    <td style={{padding:"6px 10px",fontWeight:700,color:"var(--t1)"}}>{l.co}</td>
                    <td style={{padding:"6px 10px",color:"var(--t2)"}}>
                      <div>{l.ct}</div>
                      <div style={{fontSize:10,color:"var(--t3)"}}>{l.rol}</div>
                    </td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:"#0D9488"}}>${fi(l.val)}</td>
                    <td style={{padding:"6px 10px",textAlign:"right"}}><span className="pill blue" style={{fontSize:9}}>{l.sec}</span></td>
                    <td style={{padding:"6px 10px",textAlign:"right"}}>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,background:(ETAPA_COL[l.stage]||"#94a3b8")+"20",color:ETAPA_COL[l.stage]||"#94a3b8"}}>
                        {l.stage}
                      </span>
                    </td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"monospace"}}>{l.prob}%</td>
                    <td style={{padding:"6px 10px",textAlign:"right"}}>
                      {l.tags.slice(0,2).map((t,j)=>(
                        <span key={j} style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"rgba(13,148,136,.1)",color:"#0D9488",marginLeft:3}}>{t}</span>
                      ))}
                    </td>
                  </tr>
                ))}
                {preview.length>20&&(
                  <tr><td colSpan={7} style={{padding:"8px 10px",textAlign:"center",color:"var(--t3)",fontSize:11}}>
                    ... y {preview.length-20} leads más
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Acciones */}
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button className="btn btn-s btn-sm" onClick={()=>{setStep("inicio");setPreview([]);setErrores([]);}}>
              ← Volver
            </button>
            <button className="btn btn-p btn-sm" onClick={confirmarImport} disabled={importing||preview.length===0}>
              {importing?"⏳ Importando...":"✅ Confirmar e importar "+preview.length+" leads"}
            </button>
          </div>
        </div>
      )}

      {/* -- PASO 3: DONE -- */}
      {step==="done"&&(
        <div style={{textAlign:"center",padding:60}}>
          <div style={{fontSize:56,marginBottom:16}}>🎉</div>
          <div style={{fontSize:20,fontWeight:800,color:"var(--t1)",marginBottom:8}}>
            {preview.length} leads importados exitosamente
          </div>
          <div style={{fontSize:13,color:"var(--t3)",marginBottom:28}}>
            Ya aparecen en el pipeline CRM ordenados por etapa
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button className="btn btn-p btn-sm" onClick={()=>{setStep("inicio");setPreview([]);setErrores([]);}}>
              ↑ Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// -- Componente reutilizable para barras horizontales de KPI ------------------
function BarHKpi({data, colKey="col"}) {
  const fmt = n=>Number(n||0).toLocaleString("es-PE");
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {data.slice(0,10).map((d,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:"var(--t1)",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
            <div style={{height:8,borderRadius:4,background:"var(--bd)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,background:d[colKey]||"#0D9488",width:d.pct+"%",transition:"width .4s"}}/>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:700,fontFamily:"monospace",color:"var(--t1)"}}>{fmt(d.value)}</div>
            <div style={{fontSize:10,color:"var(--t3)"}}>{d.pct}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CargaInventario({toast, usuario, proyectos, setProyectos}) {
  const fi = n=>Number(n||0).toLocaleString("es-PE");

  // -- Estados ----------------------------------------------------------------
  const [proySelId, setProySelId] = useState(proyectos[0]?.id||"");
  const [datos,     setDatos]     = useState(null);   // datos del archivo actualmente visualizado
  const [mapeo,     setMapeo]     = useState(null);
  const [fileName,  setFileName]  = useState("");
  const [tabKpi,    setTabKpi]    = useState("resumen");
  const [loading,   setLoading]   = useState(false);
  const [esNuevo,   setEsNuevo]   = useState(false);  // true solo si es archivo nuevo sin guardar
  const [alertaDups,setAlertaDups]= useState(null);
  const [invSelIdx, setInvSelIdx] = useState(null);

  const proy     = proyectos.find(p=>p.id===proySelId)||proyectos[0];
  const historial= proy?.inventarios||[];

  // -- Métricas SIEMPRE disponibles (sin importar si hay archivo cargado) -----
  const presup        = proy?.activosPresupuestados||0;
  const totalGuardado = historial.reduce((a,inv)=>a+(inv.totalUnicos||inv.total||0),0);
  // Si hay un archivo NUEVO (no guardado), sumarlo al total
  const totalMostrado = (datos&&esNuevo) ? totalGuardado+datos.length : totalGuardado;
  const pctInv        = presup>0 ? Math.round(totalMostrado/presup*100) : null;
  const adicionales   = presup>0 ? Math.max(0,totalMostrado-presup) : 0;

  // -- Al cambiar proyecto: restaurar última carga --------------------------
  useEffect(()=>{
    const h = (proyectos.find(p=>p.id===proySelId)||proyectos[0])?.inventarios||[];
    if(h.length>0 && h[0].datosCompletos){
      setDatos(h[0].datosCompletos);
      setMapeo(h[0].mapeo||null);
      setFileName(h[0].archivo||"");
      setEsNuevo(false);  // es una carga existente
      setInvSelIdx(0);
    } else {
      setDatos(null); setMapeo(null); setFileName(""); setEsNuevo(false); setInvSelIdx(null);
    }
    setAlertaDups(null);
  },[proySelId]);

  // -- Detección de duplicados -----------------------------------------------
  const getClave = (row, m) => {
    if(!m) return "";
    if(m.barcode && row[m.barcode]) return (""+row[m.barcode]).trim();
    if(m.catalogo && m.ubicacion)   return (""+( row[m.catalogo]||""))+"|"+(""+( row[m.ubicacion]||""));
    const first = Object.values(row).find(v=>v&&(""+v).trim());
    return first ? (""+first).trim() : "";
  };

  const analizarDuplicados = (archivoDatos, archivoMapeo, anteriores) => {
    // Claves ya guardadas en historial
    const yaGuardados = new Set();
    anteriores.forEach(inv=>{
      const m = inv.mapeo||archivoMapeo;
      (inv.datosCompletos||[]).forEach(r=>{ const c=getClave(r,m); if(c) yaGuardados.add(c); });
    });
    // Frecuencia en el archivo nuevo (duplicados internos)
    const freq={};
    archivoDatos.forEach(r=>{ const c=getClave(r,archivoMapeo); if(c) freq[c]=(freq[c]||0)+1; });
    const duplicados = archivoDatos.filter(r=>{ const c=getClave(r,archivoMapeo); return c&&(yaGuardados.has(c)||freq[c]>1); });
    const unicos     = archivoDatos.filter(r=>{ const c=getClave(r,archivoMapeo); return !c||(!yaGuardados.has(c)&&freq[c]===1); });
    const codsdup    = [...new Set(duplicados.map(r=>getClave(r,archivoMapeo)).filter(Boolean))];
    return {unicos, duplicados, codsdup};
  };

  // -- Guardar en proyecto ---------------------------------------------------
  const guardarEnProyecto = (forzar=false) => {
    if(!datos||!esNuevo||!proy||!setProyectos){ toast("No hay archivo nuevo para guardar","warning"); return; }
    const invAnterior = proy.inventarios||[];
    const {unicos, duplicados, codsdup} = analizarDuplicados(datos, mapeo, invAnterior);
    if(!forzar && duplicados.length>0){ setAlertaDups({duplicados,codsdup,unicos,archivoMapeo:mapeo}); return; }
    const datosFinales = forzar&&duplicados.length>0 ? unicos : datos;
    const resumenEst={};
    datosFinales.forEach(r=>{ const v=(r[mapeo?.estCon]||"—").toString().trim().toUpperCase(); resumenEst[v]=(resumenEst[v]||0)+1; });
    const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});
    setProyectos(prev=>prev.map(p=>{
      if(p.id!==proySelId) return p;
      const ant = p.inventarios||[];
      const totalAcum = ant.reduce((a,i)=>a+(i.totalUnicos||i.total),0)+datosFinales.length;
      const avPorInv  = (p.activosPresupuestados||0)>0 ? Math.round(totalAcum/p.activosPresupuestados*100) : null;
      const nuevo = {id:"INV-"+Date.now(),fecha,archivo:fileName,
        total:datosFinales.length,totalUnicos:datosFinales.length,
        duplicadosOmitidos:duplicados.length,totalAcumulado:totalAcum,
        mapeo,resumenEstados:resumenEst,datosCompletos:datosFinales};
      return {...p,inventarios:[nuevo,...ant],totalInventariado:totalAcum,
        avancePorInventario:avPorInv,
        avance:avPorInv!=null?Math.max(p.avance||0,Math.min(avPorInv,100)):p.avance||0};
    }));
    setEsNuevo(false);
    setAlertaDups(null);
    setInvSelIdx(0);
    const msg = duplicados.length>0
      ? "✓ "+fi(datosFinales.length)+" únicos guardados ("+fi(duplicados.length)+" duplicados omitidos)"
      : "✓ "+fi(datosFinales.length)+" activos guardados en "+proy.cliente;
    toast(msg,"success");
  };

  // -- Detección automática de columnas -------------------------------------
  const detectarColumnas = (headers) => {
    const h = headers.map(x=>(x||"").toLowerCase().replace(/[_\s]/g,""));
    const find = (keys) => { for(const k of keys){ const idx=h.findIndex(x=>x.includes(k.toLowerCase().replace(/[_\s]/g,""))); if(idx>=0)return headers[idx]; } return null; };
    return {
      ubicacion:   find(["descripcionubicacion","ubicacion","descubicacion","lugar","ambiente"]),
      codUbicacion:find(["codigoubicacion","codubicacion"]),
      ccosto:      find(["descripcionccosto","centrodecosto","ccosto","centrocosto","area","departamento"]),
      linea:       find(["descripcionlineaproduccion","lineaproduccion","linea","lineaprod"]),
      responsable: find(["descripcionresponsable","responsable","encargado","custodio","usuario"]),
      catalogo:    find(["descripcioncatalogo","catalogo","descripcion","descripcionactivo","tipoactivo","familia","nombre","bien"]),
      codCatalogo: find(["codigocatalogo","codcatalogo","codbien","codigo"]),
      estCon:      find(["est_con","estcon","estadoconservacion","estado_conservacion","conservacion","estado"]),
      condicion:   find(["condicion","condicionactivo"]),
      barcode:     find(["bar_nue","barnue","barcode","codigobarra","codbar","etiqueta","tag","placa"]),
      marca:       find(["marca","fabricante","brand"]),
      modelo:      find(["modelo","model"]),
      serie:       find(["serie","serial","nserie","numeroserie"]),
      color:       find(["color"]),
      medidas:     find(["medidas","medida","dimensiones"]),
      inventariador:find(["inventariador","inspector","auditor"]),
      fecha:       find(["fechalectura","fecha","date"]),
    };
  };

  // -- Parser de archivo -----------------------------------------------------
  const procesarArchivo = (file) => {
    const isXlsx = file.name.endsWith(".xlsx")||file.name.endsWith(".xls");
    const isCsv  = file.name.endsWith(".csv");
    if(!isXlsx&&!isCsv){ toast("Formato no soportado. Usa .xlsx o .csv","error"); return; }
    setLoading(true);
    setFileName(file.name);
    const finalizarProceso = (rows) => {
      if(!rows||rows.length===0){ toast("Archivo vacío o sin datos válidos","error"); setLoading(false); return; }
      const headers = Object.keys(rows[0]||{});
      const m = detectarColumnas(headers);
      setMapeo(m);
      setDatos(rows);
      setEsNuevo(true);   // NUEVO archivo — no guardado aún
      setLoading(false);
      setTabKpi("resumen");
      toast("✓ "+rows.length.toLocaleString()+" activos cargados","success");
    };
    const reader = new FileReader();
    if(isCsv){
      reader.onload=(e)=>{
        const text=e.target.result;
        const lines=text.split("\n").filter(l=>l.trim());
        const sep=lines[0].includes(";")?";":","
        const headers=lines[0].split(sep).map(h=>h.replace(/"/g,"").trim());
        const rows=lines.slice(1).map(line=>{ const vals=line.split(sep).map(v=>v.replace(/"/g,"").trim()); return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||""])); });
        finalizarProceso(rows);
      };
      reader.readAsText(file,"UTF-8");
    } else {
      reader.onload=async(e)=>{
        try{
          if(!window.XLSX){
            await new Promise((res,rej)=>{
              const s=document.createElement("script");
              s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
              s.onload=res; s.onerror=()=>rej(new Error("SheetJS no disponible"));
              document.head.appendChild(s);
            });
          }
          const wb  = window.XLSX.read(new Uint8Array(e.target.result),{type:"array"});
          const ws  = wb.Sheets[wb.SheetNames[0]];
          const raw = window.XLSX.utils.sheet_to_json(ws,{defval:"",raw:false});
          finalizarProceso(raw);
        }catch(err){ toast("Error XLSX: "+err.message,"error"); setLoading(false); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // -- Helpers de KPIs -------------------------------------------------------
  const groupBy = (col) => {
    if(!datos||!mapeo||!mapeo[col]) return [];
    const counts={};
    datos.forEach(r=>{ const v=(r[mapeo[col]]||"SIN DATO").toString().trim().substring(0,45)||"SIN DATO"; counts[v]=(counts[v]||0)+1; });
    return Object.entries(counts).map(([k,v])=>({name:k,value:v,pct:Math.round(v/datos.length*100)})).sort((a,b)=>b.value-a.value).slice(0,12);
  };
  const groupByEstado = () => {
    if(!datos||!mapeo||!mapeo.estCon) return [];
    const ECOL={BO:"#16a34a",BI:"#0284c7",RO:"#d97706",RI:"#ea580c",MO:"#dc2626",MI:"#7c3aed"};
    const EBG ={BO:"#dcfce7",BI:"#e0f2fe",RO:"#fef3c7",RI:"#ffedd5",MO:"#fee2e2",MI:"#ede9fe"};
    const ELBL={BO:"Bueno Operativo",BI:"Bueno Inoperativo",RO:"Regular Operativo",RI:"Regular Inoperativo",MO:"Malo Operativo",MI:"Malo Inoperativo"};
    const counts={};
    datos.forEach(r=>{ const v=(r[mapeo.estCon]||"—").toString().trim().toUpperCase(); counts[v]=(counts[v]||0)+1; });
    return Object.entries(counts).map(([k,v])=>({name:k,value:v,pct:Math.round(v/datos.length*100),lbl:ELBL[k]||k,col:ECOL[k]||"#94a3b8",bg:EBG[k]||"#f1f5f9"})).sort((a,b)=>b.value-a.value);
  };

  // -- Estado analisis IA ----------------------------------------------------
  const [iaAnalisis, setIaAnalisis] = useState("");
  const [iaLoading,  setIaLoading]  = useState(false);
  const generarAnalisisIA = async () => {
    if(!datos||datos.length===0) return;
    setIaLoading(true); setIaAnalisis("");
    try {
      const estCounts={}, catCounts={};
      const sinSerie  = datos.filter(r=>!r[mapeo?.serie]||r[mapeo?.serie]==="").length;
      const sinMarca  = datos.filter(r=>!r[mapeo?.marca]||r[mapeo?.marca]==="").length;
      const sinMedida = datos.filter(r=>!r[mapeo?.medidas]||r[mapeo?.medidas]==="").length;
      datos.forEach(r=>{
        const e=(r[mapeo?.estCon]||"—").toString().trim().toUpperCase(); estCounts[e]=(estCounts[e]||0)+1;
        const c=(r[mapeo?.catalogo]||"—").toString().trim().substring(0,30); catCounts[c]=(catCounts[c]||0)+1;
      });
      const topCat = Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const diasProy    = parseInt((proy?.plazo||"9").match(/\d+/)?.[0]||9)*7;
      const fechaInicio = proy?.inicio ? new Date(proy.inicio) : new Date();
      const fechaFin    = proy?.fin    ? new Date(proy.fin)    : new Date(fechaInicio.getTime()+diasProy*86400000);
      const diasTotal   = Math.ceil((fechaFin-fechaInicio)/86400000);
      const diasTransc  = Math.ceil((new Date()-fechaInicio)/86400000);
      const diasRest    = Math.max(0,diasTotal-diasTransc);
      const avanceEsp   = diasTotal>0 ? Math.round(diasTransc/diasTotal*100) : 0;
      const estLines    = Object.entries(estCounts).map(([k,v])=>k+": "+v+" ("+Math.round(v/datos.length*100)+"%)").join(", ");
      const catLines    = topCat.map(([k,v])=>k+": "+v).join(", ");
      const prompt = "Eres experto en inventario de activos fijos para Aquarius Consulting S.A.C. (Lima, Perú).\n\n"
        +"PROYECTO: "+(proy?.cliente||"—")+" — "+(proy?.proyecto||"—")+"\n"
        +"Plazo: "+diasTotal+"d | Transcurridos: "+diasTransc+"d ("+avanceEsp+"%) | Restantes: "+diasRest+"d\n"
        +"Avance registrado: "+(proy?.avance||0)+"%\n\n"
        +"INVENTARIO: "+datos.length+" activos | Presupuesto: "+(presup||"no definido")+"\n"
        +"ESTADOS: "+estLines+"\n"
        +"TOP TIPOS: "+catLines+"\n"
        +"CALIDAD: Sin serie "+sinSerie+"("+Math.round(sinSerie/datos.length*100)+"%) | Sin marca "+sinMarca+" | Sin medidas "+sinMedida+"\n\n"
        +"Análisis ejecutivo (máx 350 palabras):\n"
        +"1. 📊 AVANCE: ¿adelantados, en fecha o atrasados?\n"
        +"2. ⚡ PRODUCTIVIDAD: activos/día y proyección de cierre\n"
        +"3. ⚠️ CALIDAD: puntos críticos (series, marcas, medidas)\n"
        +"4. 🔧 CONSERVACIÓN: análisis del estado\n"
        +"5. ✅ RECOMENDACIONES: 3 acciones prioritarias\n\n"
        +"Responde en español, tono profesional.";
      const resp = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const d = await resp.json();
      setIaAnalisis(d.content?.find(b=>b.type==="text")?.text||"Sin respuesta.");
    } catch(err){ 
      setIaAnalisis("⚠️ Error de conexión con IA: "+err.message+"\n\nEn Replit, asegúrate de configurar ANTHROPIC_API_KEY en los Secrets del proyecto, o usa este módulo desde claude.ai."); 
    }
    setIaLoading(false);
  };

  const TABS_KPI = [
    {id:"resumen",lbl:"Resumen"},{id:"estcon",lbl:"Estado conservación"},
    {id:"ubicacion",lbl:"Por ubicación"},{id:"ccosto",lbl:"Por centro de costo"},
    {id:"catalogo",lbl:"Por tipo/familia"},{id:"linea",lbl:"Por línea producción"},
    {id:"responsable",lbl:"Por responsable"},{id:"ia",lbl:"🤖 Análisis IA"},
  ];

  return (
    <div>
      {/* -- Modal duplicados -- */}
      {alertaDups&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9500}}>
          <div style={{background:"var(--card)",borderRadius:12,width:560,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,.3)"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid var(--bd)",background:"rgba(220,38,38,.05)",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:28}}>⚠️</span>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#DC2626"}}>
                  {alertaDups.duplicados.length.toLocaleString()} registros duplicados detectados
                </div>
                <div style={{fontSize:12,color:"var(--t2)",marginTop:2}}>
                  {alertaDups.codsdup.length} códigos repetidos · {alertaDups.unicos.length.toLocaleString()} activos únicos
                </div>
              </div>
            </div>
            <div style={{padding:"14px 20px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {l:"En el archivo",  v:datos?.length||0,           c:"#1E293B"},
                {l:"Únicos nuevos",  v:alertaDups.unicos.length,    c:"#0D9488"},
                {l:"Duplicados",     v:alertaDups.duplicados.length, c:"#DC2626"},
              ].map((k,i)=>(
                <div key={i} style={{textAlign:"center",padding:"10px 8px",background:"var(--hv)",borderRadius:8}}>
                  <div style={{fontSize:22,fontWeight:800,color:k.c}}>{fi(k.v)}</div>
                  <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{k.l}</div>
                </div>
              ))}
            </div>
            <div style={{padding:"0 20px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--t2)",marginBottom:6}}>Códigos duplicados:</div>
              <div style={{maxHeight:120,overflow:"auto",background:"var(--hv)",borderRadius:8,padding:10,display:"flex",flexWrap:"wrap",gap:4}}>
                {alertaDups.codsdup.slice(0,60).map((cod,i)=>(
                  <span key={i} style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"rgba(220,38,38,.1)",color:"#DC2626",fontWeight:600,fontFamily:"monospace"}}>{cod}</span>
                ))}
                {alertaDups.codsdup.length>60&&<span style={{fontSize:10,color:"var(--t3)"}}>...y {alertaDups.codsdup.length-60} más</span>}
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid var(--bd)",display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button className="btn btn-s btn-sm" onClick={()=>{
                const exportXlsx=async()=>{
                  if(!window.XLSX){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
                  const wb=window.XLSX.utils.book_new();
                  const headers=Object.keys(alertaDups.duplicados[0]||{});
                  const ws=window.XLSX.utils.json_to_sheet(alertaDups.duplicados,{header:headers});
                  ws['!cols']=headers.map(h=>({wch:Math.max(h.length+2,...alertaDups.duplicados.slice(0,30).map(r=>String(r[h]||'').length),10)}));
                  window.XLSX.utils.book_append_sheet(wb,ws,'Duplicados');
                  const codigos=alertaDups.codsdup.map((cod,i)=>({'N':i+1,'Codigo':cod,'Veces':alertaDups.duplicados.filter(r=>Object.values(r).some(v=>String(v||'').trim()===cod)).length}));
                  const ws2=window.XLSX.utils.json_to_sheet(codigos);
                  ws2['!cols']=[{wch:5},{wch:35},{wch:10}];
                  window.XLSX.utils.book_append_sheet(wb,ws2,'Codigos duplicados');
                  window.XLSX.writeFile(wb,'Duplicados_'+fileName.replace(/\.([^.]+)$/,'')+'_'+new Date().toLocaleDateString('es-PE').replace(/\//g,'-')+'.xlsx');
                  toast('✓ Excel descargado ('+alertaDups.duplicados.length+' registros, '+alertaDups.codsdup.length+' códigos)','success');
                };exportXlsx()
              }}>📥 Exportar duplicados CSV</button>
              <button className="btn btn-r btn-sm" onClick={()=>setAlertaDups(null)}>Cancelar</button>
              <button className="btn btn-p btn-sm" onClick={()=>guardarEnProyecto(true)}>✅ Guardar solo únicos ({fi(alertaDups.unicos.length)})</button>
            </div>
          </div>
        </div>
      )}


      {/* -- Header -- */}
      <div className="sh">
        <div>
          <div className="st">Carga de Inventario</div>
          <div className="ss">Carga masiva · KPIs automáticos · Detección inteligente de columnas</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {datos&&<span className="pill teal">{fi(datos.length)} activos</span>}
          {datos&&esNuevo&&<button className="btn btn-p btn-sm" onClick={()=>guardarEnProyecto()}>💾 Guardar en proyecto</button>}
          {datos&&!esNuevo&&<span className="pill teal">✓ Guardado</span>}
        </div>
      </div>

      {/* -- Selector de proyecto -- */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14,padding:"12px 16px",background:"var(--card)",borderRadius:"var(--r)",border:"1px solid var(--bd)"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--t2)",flexShrink:0}}>Proyecto:</span>
        <select value={proySelId} onChange={e=>{setProySelId(e.target.value);}} style={{flex:1,maxWidth:420,fontWeight:600}}>
          {proyectos.map(p=><option key={p.id} value={p.id}>{p.cliente} — {p.id} ({p.estado})</option>)}
        </select>
        <div style={{display:"flex",gap:8,fontSize:11,color:"var(--t3)",flexShrink:0,alignItems:"center"}}>
          {presup>0&&(
            <span>
              <span style={{color:"var(--t3)"}}>Inv: </span>
              <strong style={{color:pctInv==null?"#64748b":pctInv>100?"#DC2626":pctInv>=80?"#0D9488":"#D97706"}}>
                {fi(totalMostrado)}{presup>0?" / "+fi(presup):""}
                {pctInv!=null?" ("+pctInv+"%)":""}
              </strong>
            </span>
          )}
          {historial.length>0&&<span className="pill teal" style={{fontSize:9}}>{historial.length} carga(s)</span>}
        </div>
      </div>

      {/* -- PANEL AVANCE — siempre visible si hay presupuesto o historial -- */}
      {(presup>0||totalGuardado>0)&&(
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div className="ct">Avance del inventario</div>
              <div className="cs">
                <strong>{fi(totalMostrado)}</strong> activos inventariados
                {presup>0&&<span> de <strong>{fi(presup)}</strong> presupuestados</span>}
                {historial.length>0&&<span style={{marginLeft:8}}>· {historial.length} carga(s)</span>}
              </div>
            </div>
            {pctInv!=null&&(
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:28,fontWeight:900,color:pctInv>100?"#DC2626":pctInv>=80?"#0D9488":"#D97706",lineHeight:1}}>
                  {pctInv}%
                </div>
                <div style={{fontSize:10,color:"var(--t3)"}}>avance inventario</div>
              </div>
            )}
          </div>
          {/* Barra principal */}
          {presup>0&&(
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--t3)",marginBottom:4}}>
                <span>0</span>
                <span style={{fontWeight:600,color:"var(--t1)"}}>{fi(presup)} presupuestados</span>
              </div>
              <div style={{height:20,borderRadius:6,background:"rgba(0,0,0,.07)",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",borderRadius:6,transition:"width .5s",
                  background:pctInv>100?"#DC2626":pctInv>=80?"#0D9488":"#D97706",
                  width:Math.min(pctInv||0,100)+"%",
                  display:"flex",alignItems:"center",paddingLeft:8}}>
                  {(pctInv||0)>=12&&<span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{fi(totalMostrado)}</span>}
                </div>
              </div>
              {adicionales>0&&(
                <div style={{marginTop:6,padding:"6px 10px",background:"rgba(220,38,38,.06)",border:"1px solid rgba(220,38,38,.2)",borderRadius:6,fontSize:11}}>
                  🔴 <strong>{fi(adicionales)} activos adicionales</strong> sobre presupuesto
                  {proy?.costoUnitAdicional&&<span> · Costo adicional: <strong style={{color:"#DC2626"}}>${fi(adicionales*proy.costoUnitAdicional)} USD</strong></span>}
                </div>
              )}
            </div>
          )}
          {/* Desglose por archivo */}
          {historial.length>0&&(
            <div style={{borderTop:"1px solid var(--bd)",paddingTop:10}}>
              <div style={{fontSize:10,color:"var(--t3)",fontWeight:600,marginBottom:6,letterSpacing:.5}}>DESGLOSE POR ARCHIVO:</div>
              {historial.map((inv,i)=>{
                const pctFile = presup>0?Math.round((inv.totalUnicos||inv.total)/presup*100):0;
                return(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={inv.archivo}>
                      📄 {inv.archivo} <span style={{color:"var(--t3)",fontSize:10}}>{inv.fecha}</span>
                    </div>
                    {presup>0&&(
                      <div style={{width:80,height:6,borderRadius:3,background:"rgba(0,0,0,.07)"}}>
                        <div style={{height:"100%",borderRadius:3,background:"#0D9488",width:Math.min(pctFile,100)+"%",opacity:.8}}/>
                      </div>
                    )}
                    <div style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color:"var(--t1)",minWidth:50,textAlign:"right"}}>
                      {fi(inv.totalUnicos||inv.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* -- Historial de cargas -- */}
      {historial.length>0&&(
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div><div className="ct">Historial de cargas</div><div className="cs">{historial.length} archivo(s) · {fi(totalGuardado)} activos acumulados</div></div>
            <button className="btn btn-s btn-sm" onClick={()=>{
              const todos=historial.flatMap(inv=>inv.datosCompletos||[]);
              if(todos.length>0){setDatos(todos);setMapeo(historial[0].mapeo);setFileName("Todos los archivos");setEsNuevo(false);}
              else toast("Los archivos no tienen datos en caché","warning");
            }}>📊 Ver todos ({fi(totalGuardado)})</button>
          </div>
          {historial.map((inv,i)=>(
            <div key={inv.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",borderRadius:8,border:"1px solid var(--bd)",background:invSelIdx===i?"rgba(13,148,136,.06)":"var(--card)",cursor:"pointer",marginBottom:6,transition:"background .15s"}}
              onClick={()=>{if(inv.datosCompletos){setDatos(inv.datosCompletos);setMapeo(inv.mapeo||null);setFileName(inv.archivo||"");setEsNuevo(false);setInvSelIdx(i);}else toast("Datos no disponibles","warning");}}>
              <span style={{fontSize:20}}>📄</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inv.archivo||"Sin nombre"}</div>
                <div style={{fontSize:11,color:"var(--t3)"}}>
                  {inv.fecha} · <strong>{fi(inv.totalUnicos||inv.total)}</strong> activos
                  {inv.duplicadosOmitidos>0&&<span style={{color:"#DC2626",marginLeft:6}}>{fi(inv.duplicadosOmitidos)} dups. omitidos</span>}
                  {inv.resumenEstados&&Object.entries(inv.resumenEstados).slice(0,3).map(([k,v])=>(
                    <span key={k} style={{marginLeft:6,background:"rgba(13,148,136,.1)",color:"#0D9488",padding:"1px 6px",borderRadius:8,fontSize:10}}>{k}: {v}</span>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexShrink:0}}>
                {invSelIdx===i&&<span className="pill teal" style={{fontSize:9}}>Visualizando</span>}
                <button className="btn btn-r btn-sm" style={{fontSize:10,padding:"2px 8px"}}
                  onClick={e=>{e.stopPropagation();setProyectos&&setProyectos(prev=>prev.map(p=>{if(p.id!==proySelId)return p;const ni=(p.inventarios||[]).filter((_,x)=>x!==i);const ta=ni.reduce((a,x)=>a+(x.totalUnicos||x.total),0);return{...p,inventarios:ni,totalInventariado:ta};}));if(invSelIdx===i){setDatos(null);setInvSelIdx(null);}else if(invSelIdx>i)setInvSelIdx(invSelIdx-1);toast("Carga eliminada","success");}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -- Zona de carga -- */}
      {!datos&&(
        <div style={{maxWidth:640,margin:"0 auto"}}>
          <div style={{border:"2px dashed var(--bd)",borderRadius:12,padding:48,textAlign:"center",background:"var(--hv)",cursor:"pointer"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#0D9488";}}
            onDragLeave={e=>{e.currentTarget.style.borderColor="var(--bd)";}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor="var(--bd)";const f=e.dataTransfer.files[0];if(f)procesarArchivo(f);}}
            onClick={()=>document.getElementById("inv-file-input").click()}>
            <div style={{fontSize:48,marginBottom:12}}>📂</div>
            <div style={{fontSize:16,fontWeight:700,color:"var(--t1)",marginBottom:8}}>Arrastra tu archivo aquí o haz clic para seleccionar</div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:16}}>Formatos soportados: <strong>Excel (.xlsx, .xls)</strong> y <strong>CSV (UTF-8)</strong> · Máx. 50,000 filas</div>
            <div style={{fontSize:11,color:"var(--t3)",background:"var(--card)",borderRadius:8,padding:"10px 16px",display:"inline-block",textAlign:"left"}}>
              <div style={{fontWeight:700,marginBottom:4}}>Columnas detectadas automáticamente:</div>
              <div>Ubicación · Centro de Costo · Línea de Producción</div>
              <div>Responsable · Tipo/Familia · Estado de Conservación</div>
              <div>Código de barra · Marca · Modelo · Condición</div>
            </div>
            <input id="inv-file-input" type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)procesarArchivo(f);e.target.value="";}}/>
          </div>
          <div className="card" style={{marginTop:16,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--t1)",marginBottom:10}}>¿Cómo preparar tu archivo?</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"var(--t2)"}}>
              {[["1️⃣","Carga directamente tu Excel (.xlsx) exportado desde SITIA u otro sistema"],["2️⃣","No importa el orden de columnas — el sistema las detecta automáticamente"],["3️⃣","La primera fila debe contener los nombres de columna"],["4️⃣","Los estados de conservación pueden ser: BO, BI, RO, RI, MO, MI"]].map(([ico,txt],i)=>(
                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",background:"var(--hv)",borderRadius:6}}><span style={{fontSize:16,flexShrink:0}}>{ico}</span><span>{txt}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- Loading -- */}
      {loading&&<div style={{textAlign:"center",padding:60}}><div style={{fontSize:32,marginBottom:8}}>⏳</div><div style={{fontSize:13,color:"var(--t2)"}}>Procesando {fileName}...</div></div>}

      {/* -- Dashboard KPIs -- */}
      {datos&&!loading&&(()=>{
        const estData   = groupByEstado();
        const ubData    = groupBy("ubicacion");
        const ccData    = groupBy("ccosto");
        const catData   = groupBy("catalogo");
        const linData   = groupBy("linea");
        const respData  = groupBy("responsable");
        const totalBueno= estData.filter(e=>["BO","BI"].includes(e.name)).reduce((a,e)=>a+e.value,0);
        const totalReg  = estData.filter(e=>["RO","RI"].includes(e.name)).reduce((a,e)=>a+e.value,0);
        const totalMalo = estData.filter(e=>["MO","MI"].includes(e.name)).reduce((a,e)=>a+e.value,0);
        const pctBueno  = datos.length>0?Math.round(totalBueno/datos.length*100):0;
        return (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 14px",background:"rgba(13,148,136,.06)",borderRadius:8,border:"1px solid rgba(13,148,136,.15)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>📊</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--t1)"}}>{fileName}</div>
                  <div style={{fontSize:11,color:"var(--t3)"}}>{fi(datos.length)} registros · {Object.values(mapeo||{}).filter(Boolean).length} columnas detectadas{esNuevo&&<span style={{color:"#D97706",marginLeft:8}}>⚠ Sin guardar</span>}</div>
                </div>
              </div>
              <button className="btn btn-s btn-sm" onClick={()=>{setDatos(null);setMapeo(null);setFileName("");setEsNuevo(false);}}>🔄 Cargar otro archivo</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
              <div className="kpi teal"><div className="kpi-l">📦 En este archivo</div><div className="kpi-v mono">{fi(datos.length)}</div></div>
              <div className="kpi teal"><div className="kpi-l">✅ Estado bueno</div><div className="kpi-v mono">{fi(totalBueno)} ({pctBueno}%)</div></div>
              <div className="kpi amber"><div className="kpi-l">⚠️ Regular</div><div className="kpi-v mono">{fi(totalReg)}</div></div>
              <div className="kpi red"><div className="kpi-l">❌ Malo</div><div className="kpi-v mono">{fi(totalMalo)}</div></div>
            </div>
            <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
              {TABS_KPI.map(t=><button key={t.id} onClick={()=>setTabKpi(t.id)} className={"btn btn-sm "+(tabKpi===t.id?"btn-p":"btn-s")} style={{fontSize:11}}>{t.lbl}</button>)}
            </div>
            {tabKpi==="resumen"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div className="card" style={{padding:16}}>
                  <div className="ct" style={{marginBottom:12}}>Estado de conservación</div>
                  {estData.map((e,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <div style={{width:36,height:36,borderRadius:8,background:e.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:800,color:e.col}}>{e.name}</span></div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,fontWeight:600,color:"var(--t1)"}}>{e.lbl}</span><span style={{fontSize:11,fontFamily:"monospace",fontWeight:700,color:e.col}}>{fi(e.value)} ({e.pct}%)</span></div>
                        <div style={{height:6,borderRadius:3,background:"var(--bd)"}}><div style={{height:"100%",borderRadius:3,background:e.col,width:e.pct+"%",transition:"width .4s"}}/></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{padding:16}}>
                  <div className="ct" style={{marginBottom:12}}>Top 5 tipos de activo</div>
                  <BarHKpi data={catData.slice(0,5)} colKey="col"/>
                  <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--bd)"}}>
                    <div className="ct" style={{marginBottom:8}}>Columnas detectadas</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {Object.entries(mapeo||{}).filter(([,v])=>v).map(([k,v])=>(
                        <span key={k} style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(13,148,136,.1)",color:"#0D9488",fontWeight:600}}>{k}: <span style={{fontFamily:"monospace",fontWeight:400}}>{v}</span></span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tabKpi==="estcon"&&(<div className="card" style={{padding:20}}><div className="ct" style={{marginBottom:16}}>Distribución por estado de conservación</div>{mapeo?.estCon?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>{estData.map((e,i)=>(<div key={i} style={{border:"2px solid "+e.col+"30",borderRadius:10,padding:16,background:e.bg+"80"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{width:40,height:40,borderRadius:8,background:e.col,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,fontWeight:900,color:"#fff"}}>{e.name}</span></div><div><div style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>{e.lbl}</div></div></div><div style={{fontSize:28,fontWeight:900,fontFamily:"monospace",color:e.col,marginBottom:2}}>{fi(e.value)}</div><div style={{fontSize:12,color:"var(--t2)"}}>{e.pct}% del total</div><div style={{marginTop:8,height:6,borderRadius:3,background:"rgba(0,0,0,.1)"}}><div style={{height:"100%",borderRadius:3,background:e.col,width:e.pct+"%"}}/></div></div>))}</div>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna de estado no detectada.</div>}</div>)}
            {tabKpi==="ubicacion"&&(<div className="card" style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="ct">Por ubicación</div><span className="pill blue">{ubData.length} ubicaciones</span></div>{mapeo?.ubicacion?<BarHKpi data={ubData} colKey="col"/>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna de ubicación no detectada.</div>}</div>)}
            {tabKpi==="ccosto"&&(<div className="card" style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="ct">Por centro de costo</div><span className="pill blue">{ccData.length} centros</span></div>{mapeo?.ccosto?<BarHKpi data={ccData} colKey="col"/>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna no detectada.</div>}</div>)}
            {tabKpi==="catalogo"&&(<div className="card" style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="ct">Por tipo / familia</div><span className="pill blue">{catData.length} tipos</span></div>{mapeo?.catalogo?<BarHKpi data={catData} colKey="col"/>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna no detectada.</div>}</div>)}
            {tabKpi==="linea"&&(<div className="card" style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="ct">Por línea de producción</div><span className="pill blue">{linData.length} líneas</span></div>{mapeo?.linea?<BarHKpi data={linData} colKey="col"/>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna no detectada.</div>}</div>)}
            {tabKpi==="responsable"&&(<div className="card" style={{padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="ct">Por responsable</div><span className="pill blue">{respData.length} responsables</span></div>{mapeo?.responsable?<BarHKpi data={respData} colKey="col"/>:<div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>⚠️ Columna no detectada.</div>}</div>)}
            {tabKpi==="ia"&&(
              <div className="card" style={{padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div><div className="ct">Análisis IA del inventario</div><div className="cs">Análisis ejecutivo · Productividad · Calidad de datos · Recomendaciones</div></div>
                  <button className="btn btn-p btn-sm" onClick={generarAnalisisIA} disabled={iaLoading}>{iaLoading?"⏳ Analizando...":"🤖 Generar análisis"}</button>
                </div>
                {!iaAnalisis&&!iaLoading&&<div style={{textAlign:"center",padding:40,color:"var(--t3)"}}><div style={{fontSize:36,marginBottom:12}}>🤖</div><div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Análisis IA disponible</div><button className="btn btn-p" onClick={generarAnalisisIA}>🤖 Generar análisis ahora</button></div>}
                {iaLoading&&<div style={{textAlign:"center",padding:40}}><div style={{fontSize:32,marginBottom:8}}>⏳</div><div style={{fontSize:13,color:"var(--t2)"}}>Analizando {fi(datos.length)} activos...</div></div>}
                {iaAnalisis&&!iaLoading&&<div style={{background:"var(--hv)",borderRadius:10,padding:20,fontSize:13,color:"var(--t1)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{iaAnalisis}</div>}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}


function GestionRecursos({toast, usuario, proyectos, cotizaciones, proyectoPresel}) {
  const [proySelId, setProySelId] = useState(
    proyectoPresel || proyectos.find(p=>p.estado==="ejecucion")?.id || proyectos[0]?.id || ""
  );
  const [tab, setTab] = useState("solicitudes");
  const [modalReporte, setModalReporte] = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiReq, setAiReq]               = useState("");
  const [modalEditar, setModalEditar]   = useState(false);
  // Estado del formulario de requerimiento — precargado con datos cotizados
  const [formInicial, setFormInicial] = useState(null);

  const canEdit = ["Admin","Operaciones","Jefe Proyecto","RRHH"].includes(usuario.rol);
  const proy    = proyectos.find(p=>p.id===proySelId) || proyectos[0];

  // Cotización vinculada
  const cotVinc = (cotizaciones||[]).find(c=>
    (c.estado==="ganado") && (c.cliente===proy?.cliente || c.id===proy?.cotId)
  );

  // Recursos cotizados
  const personalCot = (formInicial?.personal?.filter(p=>p.cant>0)) || cotVinc?.personal || proy?.personal || [];

  // Inicializar reqForm cuando cambia proyecto/cotización
  React.useEffect(()=>{
    // Construir formInicial con la estructura exacta de FORM_INIT de Requerimientos
    const cotPersonal = (cotVinc?.personal||proy?.personal||[]).map((cp,idx)=>({
      id:idx, cargo:cp.cargo, cant:cp.cant||1,
      dias:Math.round((cp.horas||0)/8), horas:8,
      fechaInicio:"", fechaFin:"", desdeCot:true
    }));
    const extrasPersonal = PERSONAL_CARGOS_REQ
      .filter(c=>!cotPersonal.some(p=>p.cargo.toLowerCase().includes(c.toLowerCase().split(" ")[0])))
      .map((cargo,i)=>({id:cotPersonal.length+i,cargo,cant:0,dias:0,horas:8,fechaInicio:"",fechaFin:"",desdeCot:false}));

    setFormInicial({
      // Datos generales
      proyectoId: proy?.id||"",
      proyectoNombre: proy?.proyecto||proy?.cliente||"",
      cliente: proy?.cliente||"",
      area: "", descripcion: proy?.proyecto||"",
      centroCostos: "", solicitante: usuario.nombre,
      fechaSolicitud: new Date().toLocaleDateString("es-PE"),
      fechaInicio: proy?.inicio||"", fechaFin:"",
      // Personal con datos de la cotización
      personal: [...cotPersonal, ...extrasPersonal],
      // Equipos TI
      laptops: cotVinc?.laptops||{cant:0,detalle:""},
      terminales: cotVinc?.terminales||{cant:0,detalle:"",tipo:"manual",fechaEntrega:"",fechaDev:""},
      sitia:  cotVinc?.sitia ||{req:false,cant:0},
      sicex:  cotVinc?.sicex ||{req:false,cant:0},
      msoffice: cotVinc?.msoffice||{req:false},
      otroSoftware: cotVinc?.otroSoftware||"",
      // Etiquetas y placas
      etiquetasPoliester: cotVinc?.etiquetasPoliester||{cant:0,tipo:"codigo_barras"},
      etiquetasPapel:     cotVinc?.etiquetasPapel    ||{cant:0,tipo:"codigo_barras"},
      protectores:        cotVinc?.protectores        ||{cant:0},
      placas:             cotVinc?.placas             ||{placaA234:0,placaA21:0,placaB234:0,placaB21:0},
      fechaEntregaEquipos:"", fechaDevolucion:"", comentariosEquipos:"",
      // EPP del catálogo con cant 0 (usuario ajusta tallas y cant)
      epp: EPP_CATALOGO.map((e,i)=>({id:i,cat:e.cat,item:e.item,cant:0,talla:"",tallas:[]})),
      // Viáticos
      viaticos: cotVinc?.viaticos?.length>0 ? cotVinc.viaticos :
        [{id:1,concepto:"Pasajes (ida y vuelta)",cant:0,personas:0,monto:0,dias:0},
         {id:2,concepto:"Alojamiento",cant:0,personas:0,monto:0,dias:0},
         {id:3,concepto:"Alimentación diaria",cant:0,personas:0,monto:0,dias:0},
         {id:4,concepto:"Movilidad local",cant:0,personas:0,monto:0,dias:0},
         {id:5,concepto:"Materiales y útiles",cant:0,personas:0,monto:0,dias:0}],
      destino: cotVinc?.destino||"", oficina:"", notas:"",
    });
  },[proySelId]);
  const eppCot      = (formInicial?.epp?.filter(e=>e.cant>0||( e.tallas||[]).reduce((a,t)=>a+(t.cant||0),0)>0)) || cotVinc?.epp || proy?.epp || [];
  const gastosCot   = cotVinc?.gastos   || proy?.gastos   || [];

  // EPP estándar Aquarius si no hay en cotización
  const EPP_ESTANDAR = [
    {item:"Casco de seguridad",cat:"Cabeza",cant:1},
    {item:"Chaleco reflectante",cat:"Torso",cant:1},
    {item:"Zapatos de seguridad punta acero",cat:"Pies",cant:1},
    {item:"Lentes de protección",cat:"Ojos",cant:1},
    {item:"Guantes de nitrilo",cat:"Manos",cant:1},
    {item:"Mameluco Tyvek",cat:"Cuerpo",cant:1},
  ];
  const eppMostrar = eppCot.length>0 ? eppCot : (formInicial?.epp?.length>0 ? formInicial.epp : EPP_ESTANDAR);

  // Equipos de la cotización (terminales/laptops/sitia)
  const equiposCot = [
    ...(cotVinc?.terminales?.cant>0 ? [{eq:"Terminales Pocket PC",cant:cotVinc.terminales.cant,tipo:cotVinc.terminales.tipo||"Manual",estado:"pendiente"}] : []),
    ...(cotVinc?.laptops?.cant>0    ? [{eq:"Laptops",cant:cotVinc.laptops.cant,tipo:cotVinc.laptops.detalle||"",estado:"pendiente"}] : []),
    ...(cotVinc?.sitia?.req         ? [{eq:"Sistema SITIA",cant:cotVinc.sitia.cant||1,tipo:"Software",estado:"pendiente"}] : []),
    ...(cotVinc?.sicex?.req         ? [{eq:"Sistema SICEX",cant:cotVinc.sicex.cant||1,tipo:"Software",estado:"pendiente"}] : []),
  ];
  // Si no hay equipos en cotización, mostrar placeholder
  const equiposMostrar = (()=>{
    // Leer de formInicial si tiene equipos guardados
    const fromForm = [
      ...(formInicial?.terminales?.cant>0?[{eq:"Terminales Pocket PC",cant:formInicial.terminales.cant,tipo:formInicial.terminales.tipo||"Manual",estado:"pendiente"}]:[]),
      ...(formInicial?.laptops?.cant>0?[{eq:"Laptops",cant:formInicial.laptops.cant,tipo:formInicial.laptops.detalle||"",estado:"pendiente"}]:[]),
      ...(formInicial?.sitia?.req?[{eq:"Sistema SITIA",cant:formInicial.sitia.cant||1,tipo:"Software",estado:"pendiente"}]:[]),
      ...(formInicial?.sicex?.req?[{eq:"Sistema SICEX",cant:formInicial.sicex.cant||1,tipo:"Software",estado:"pendiente"}]:[]),
    ];
    if(fromForm.length>0) return fromForm;
    if(equiposCot.length>0) return equiposCot;
    return [{eq:"Terminales Pocket PC",cant:"—",tipo:"Por definir",estado:"pendiente"},{eq:"Laptops",cant:"—",tipo:"Por definir",estado:"pendiente"}];
  })();

  // Viáticos de la cotización
  const viaticosCot = (formInicial?.viaticos?.filter(v=>v.personas>0||v.monto>0)) || cotVinc?.viaticos || gastosCot || [];

  // Generar análisis IA del requerimiento
  const generarAnalisisIA = async () => {
    setAiLoading(true);
    try {
      const resumen = `Proyecto: ${proy?.cliente} — ${proy?.proyecto}\nValor: $${(proy?.valor||0).toLocaleString()}\nInicio: ${proy?.inicio||"—"} | Plazo: ${proy?.plazo||"—"}\n\nPersonal cotizado:\n${personalCot.map(p=>`- ${p.cargo} ×${p.cant||1}: ${p.horas}h a $${p.tarifa}/h`).join("\n")}\n\nEPP requerido: ${eppMostrar.length} ítems\nEquipos: ${equiposMostrar.map(e=>e.eq+" ×"+(e.cant||1)).join(", ")||"Por definir"}\n${viaticosCot.length>0?"Viáticos incluidos: "+viaticosCot.map(v=>v.concepto).join(", "):""}`;
      const resp = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:`Eres un especialista en gestión de recursos para proyectos de inventario de activos fijos en Perú. Analiza este requerimiento y redacta:\n1. Resumen ejecutivo (2 oraciones)\n2. Observaciones clave (3 puntos)\n3. Recomendaciones para el área de operaciones (3 puntos)\n4. Riesgos a considerar (2 puntos)\n\nSé conciso y profesional. Responde en español.\n\n${resumen}`}]})
      });
      const d = await resp.json();
      setAiReq(d.content?.[0]?.text||"No se pudo generar el análisis.");
    } catch(e){ setAiReq("Error al conectar con la IA."); }
    setAiLoading(false);
  };

  // Generar PDF del requerimiento formal
  const generarPDFRequerimiento = () => {
    if(!proy){toast("Selecciona un proyecto","warning");return;}
    const fi = n=>Number(n||0).toLocaleString("es-PE");
    const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"long",year:"numeric"});
    const tabPersonal = personalCot.length>0
      ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          <thead><tr style="background:#1a2e4a;color:#fff">
            <th style="padding:8px 10px;text-align:left">Cargo</th>
            <th style="padding:8px 10px;text-align:center">Cant.</th>
            <th style="padding:8px 10px;text-align:right">Horas</th>
            <th style="padding:8px 10px;text-align:right">Tarifa USD/h</th>
            <th style="padding:8px 10px;text-align:right">Costo USD</th>
          </tr></thead><tbody>
          ${personalCot.map((p,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
            <td style="padding:6px 10px;font-weight:600">${p.cargo}</td>
            <td style="padding:6px 10px;text-align:center">×${p.cant||1}</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace">${p.horas}h</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace">$${p.tarifa}</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1a2e4a">$${fi((p.cant||1)*p.horas*p.tarifa)}</td>
          </tr>`).join("")}
          <tr style="background:#1a2e4a;color:#fff">
            <td colspan="4" style="padding:8px 10px;font-weight:700">TOTAL PERSONAL</td>
            <td style="padding:8px 10px;text-align:right;font-weight:800;font-family:monospace">$${fi(personalCot.reduce((a,p)=>a+(p.cant||1)*p.horas*p.tarifa,0))}</td>
          </tr></tbody></table>` : "<p style='color:#94a3b8;font-size:12px'>Sin personal registrado</p>";

    const tabEpp = `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
      <thead><tr style="background:#1a2e4a;color:#fff">
        <th style="padding:8px 10px;text-align:left">Ítem EPP</th>
        <th style="padding:8px 10px;text-align:left">Categoría</th>
        <th style="padding:8px 10px;text-align:center">Cant.</th>
        ${eppCot.length>0?'<th style="padding:8px 10px;text-align:right">Costo USD</th>':""}
      </tr></thead><tbody>
      ${eppMostrar.map((e,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
        <td style="padding:6px 10px;font-weight:600">${e.item||e.desc||e}</td>
        <td style="padding:6px 10px;color:#64748b">${e.cat||"General"}</td>
        <td style="padding:6px 10px;text-align:center">×${e.cant||1}</td>
        ${eppCot.length>0?`<td style="padding:6px 10px;text-align:right;font-family:monospace">$${fi((e.cant||1)*(e.precio||0))}</td>`:""}
      </tr>`).join("")}
      </tbody></table>`;

    const tabEquipos = equiposMostrar.map((e,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
      <td style="padding:6px 10px;font-weight:600">${e.eq}</td>
      <td style="padding:6px 10px;text-align:center">×${e.cant}</td>
      <td style="padding:6px 10px;color:#64748b">${e.tipo}</td>
      <td style="padding:6px 10px;text-align:center"><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#FEF3C7;color:#92400e">${e.estado}</span></td>
    </tr>`).join("");

    const tabViaticos = viaticosCot.length>0
      ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          <thead><tr style="background:#1a2e4a;color:#fff">
            <th style="padding:8px 10px;text-align:left">Concepto</th>
            <th style="padding:8px 10px;text-align:center">Personas</th>
            <th style="padding:8px 10px;text-align:right">S/./persona</th>
            <th style="padding:8px 10px;text-align:center">Días</th>
            <th style="padding:8px 10px;text-align:right">Total S/.</th>
          </tr></thead><tbody>
          ${viaticosCot.map((v,i)=>`<tr style="background:${i%2?"#f8fafc":"#fff"}">
            <td style="padding:6px 10px">${v.concepto||v.desc}</td>
            <td style="padding:6px 10px;text-align:center">${v.personas||1}</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace">S/ ${fi(v.monto||v.usd||0)}</td>
            <td style="padding:6px 10px;text-align:center">${v.dias||1}</td>
            <td style="padding:6px 10px;text-align:right;font-family:monospace;font-weight:700;color:#1D9E75">S/ ${fi((v.personas||1)*(v.monto||v.usd||0)*Math.max(v.dias||1,1))}</td>
          </tr>`).join("")}
          <tr style="background:#1a2e4a;color:#fff">
            <td colspan="4" style="padding:8px 10px;font-weight:700">TOTAL VIÁTICOS</td>
            <td style="padding:8px 10px;text-align:right;font-weight:800;font-family:monospace">S/ ${fi(viaticosCot.reduce((a,v)=>a+(v.personas||1)*(v.monto||v.usd||0)*Math.max(v.dias||1,1),0))}</td>
          </tr></tbody></table>` : "<p style='color:#94a3b8;font-size:12px'>Sin viáticos registrados</p>";

    const analisisHTML = aiReq
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:8px">
          <div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">🤖 Análisis IA — Nexova</div>
          <div style="font-size:12px;color:#1e293b;white-space:pre-line;line-height:1.7">${aiReq}</div>
        </div>`
      : "<p style='color:#94a3b8;font-size:12px;font-style:italic'>Análisis IA no generado — use el botón \"Análisis IA\" antes de imprimir.</p>";

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
    <title>Requerimiento Formal — ${proy.cliente}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;font-size:13px;margin:0;padding:0}
      .cover{background:#1a2e4a;color:#fff;padding:40px 48px;page-break-after:always}
      .cover-title{font-size:28px;font-weight:900;letter-spacing:1px;margin-bottom:4px}
      .cover-sub{font-size:14px;color:rgba(255,255,255,.6);margin-bottom:32px}
      .meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,.15)}
      .meta-item label{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:4px}
      .meta-item strong{font-size:14px;color:#fff}
      .container{max-width:900px;margin:0 auto;padding:32px 40px}
      .section{margin-bottom:28px}
      .section-title{font-size:11px;font-weight:700;color:#1a2e4a;text-transform:uppercase;letter-spacing:.8px;border-bottom:2px solid #4a9fd4;padding-bottom:6px;margin-bottom:14px}
      table{width:100%;border-collapse:collapse}
      th{padding:7px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#fff;background:#1a2e4a}
      td{padding:6px 10px;font-size:12px;border-bottom:1px solid #e2e8f0}
      .footer{text-align:center;padding:24px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:40px}
      @media print{.cover{page-break-after:always}.section{page-break-inside:avoid}}
    </style></head><body>
    <div class="cover">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">AQUARIUS CONSULTING S.A.C.</div>
      <div class="cover-title">REQUERIMIENTO FORMAL DE RECURSOS</div>
      <div class="cover-sub">Documento oficial para área de Operaciones y RRHH</div>
      <div style="display:inline-block;padding:4px 14px;border-radius:20px;background:rgba(29,158,117,.2);border:1px solid rgba(29,158,117,.4);font-size:11px;font-weight:700;color:#6ee7b7">● PROYECTO GANADO — EN EJECUCIÓN</div>
      <div class="meta">
        <div class="meta-item"><label>Cliente</label><strong>${proy.cliente}</strong></div>
        <div class="meta-item"><label>Proyecto</label><strong>${proy.proyecto}</strong></div>
        <div class="meta-item"><label>ID Proyecto</label><strong>${proy.id}</strong></div>
        <div class="meta-item"><label>Valor contrato</label><strong>USD ${fi(proy.valor||cotVinc?.venta||0)}</strong></div>
        <div class="meta-item"><label>Fecha inicio</label><strong>${proy.inicio||"—"}</strong></div>
        <div class="meta-item"><label>Plazo</label><strong>${proy.plazo||cotVinc?.plazo||"—"}</strong></div>
        <div class="meta-item"><label>Cotización ref.</label><strong>${cotVinc?.id||"—"}</strong></div>
        <div class="meta-item"><label>Emisión</label><strong>${fecha}</strong></div>
        <div class="meta-item"><label>Elaborado por</label><strong>${usuario.nombre}</strong></div>
      </div>
    </div>
    <div class="container">
      <div class="section">
        <div class="section-title">1. Personal Requerido</div>
        ${tabPersonal}
      </div>
      <div class="section">
        <div class="section-title">2. EPP y Materiales de Seguridad</div>
        ${tabEpp}
      </div>
      <div class="section">
        <div class="section-title">3. Equipos Tecnológicos</div>
        <table>
          <thead><tr><th>Equipo</th><th style="text-align:center">Cant.</th><th>Tipo / Modelo</th><th style="text-align:center">Estado</th></tr></thead>
          <tbody>${tabEquipos}</tbody>
        </table>
      </div>
      <div class="section">
        <div class="section-title">4. Viáticos y Fondos</div>
        ${tabViaticos}
      </div>
      <div class="section">
        <div class="section-title">5. Análisis y Recomendaciones</div>
        ${analisisHTML}
      </div>
      <div class="footer">
        Nexova CRM Pro · Aquarius Consulting S.A.C. · nexova.pe · Documento generado el ${fecha} · Confidencial
      </div>
    </div>
    </body></html>`;

    generarPDFRico({
      nombre:"REQ-"+proy.id,
      titulo:"Requerimiento Formal de Recursos",
      subtitulo:proy.cliente+" · "+proy.proyecto+" · "+fecha,
      kpis:[
        {label:"Cotización",value:cotVinc?.id||"Sin cotización",color:"#4a9fd4"},
        {label:"Valor contrato",value:"USD "+(proy.valor||cotVinc?.venta||0).toLocaleString(),color:"#1D9E75"},
        {label:"Personal",value:reqForm.personal.reduce((a,p)=>a+(p.cant||1),0)+" personas",color:"#1a2e4a"},
        {label:"Horas totales",value:reqForm.personal.reduce((a,p)=>a+(p.cant||1)*(p.horas||0),0)+"h",color:"#BA7517"},
      ],
      secciones:[
        {titulo:"1. Personal Requerido",contenido:tabPersonal},
        {titulo:"2. EPP y Materiales de Seguridad",contenido:tabEpp},
        {titulo:"3. Equipos Tecnológicos",contenido:'<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#1a2e4a;color:#fff"><th style="padding:7px 10px">Equipo</th><th style="padding:7px 10px;text-align:center">Cant.</th><th style="padding:7px 10px">Tipo</th><th style="padding:7px 10px;text-align:center">Estado</th></tr></thead><tbody>'+tabEquipos+'</tbody></table>'},
        {titulo:"4. Viáticos y Fondos",contenido:tabViaticos},
        ...(aiReq?[{titulo:"5. Análisis IA — Recomendaciones",contenido:analisisHTML}]:[]),
      ],
      analisis:aiReq?{texto:aiReq}:{},
    });
    toast("✓ Requerimiento formal descargado","success");
  };

  const updReqPersonal = (id,field,val) =>
    setReqForm(f=>({...f,personal:f.personal.map(p=>p.id===id?{...p,[field]:field==="cant"||field==="horas"?parseInt(val)||0:val}:p)}));
  const updReqEpp = (id,field,val) =>
    setReqForm(f=>({...f,epp:f.epp.map(e=>e.id===id?{...e,[field]:parseInt(val)||0}:e)}));
  const updReqEquipo = (i,field,val) =>
    setReqForm(f=>({...f,equipos:f.equipos.map((e,idx)=>idx===i?{...e,[field]:val}:e)}));
  const addReqPersonal = () =>
    setReqForm(f=>({...f,personal:[...f.personal,{id:Date.now(),cargo:"Cargo nuevo",cant:1,horas:8,tarifa:0}]}));
  const addReqEquipo = () =>
    setReqForm(f=>({...f,equipos:[...f.equipos,{eq:"Equipo nuevo",cant:1,tipo:"",estado:"pendiente"}]}));

  return (
    <div>
            {/* ── Modal Editar Requerimiento ── */}
      {modalEditar&&formInicial&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:12}}>
          <div style={{background:"var(--card)",borderRadius:"var(--r)",width:720,maxHeight:"95vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.3)"}}>
            <Requerimientos
              proyectos={proyectos}
              cotizaciones={cotizaciones}
              toast={toast}
              usuario={usuario}
              modoEdicion={true}
              formInicial={formInicial}
              onGuardarEdicion={(f)=>{setFormInicial(f);setModalEditar(false);toast("✓ Requerimiento actualizado","success");}}
            />
          </div>
        </div>
      )}


      {/* -- Header -- */}
      <div className="sh">
        <div>
          <div className="st">Gestión de Recursos</div>
          <div className="ss">Recursos cotizados por proyecto ganado</div>
        </div>
        {canEdit&&<button className="btn btn-p btn-sm" onClick={()=>setModalEditar(true)}>
          ✏️ Editar requerimiento
        </button>}
      </div>

      {/* -- Selector de proyecto -- */}
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,
        padding:"12px 16px",background:"var(--card)",borderRadius:"var(--r)",
        border:"1px solid var(--bd)"}}>
        <span style={{fontSize:12,fontWeight:600,color:"var(--t2)",flexShrink:0}}>Proyecto:</span>
        <select value={proySelId} onChange={e=>setProySelId(e.target.value)}
          style={{flex:1,maxWidth:420,fontWeight:600,color:"var(--t1)"}}>
          {proyectos.map(p=>(
            <option key={p.id} value={p.id}>{p.cliente} — {p.id}
              {p.estado==="ejecucion"?" ✓":" ("+p.estado+")"}
            </option>
          ))}
        </select>
        {proy&&(
          <div style={{display:"flex",gap:10,fontSize:11,color:"var(--t3)",flexShrink:0,alignItems:"center"}}>
            <span>Valor: <strong style={{color:C.teal}}>${(proy.valor||0).toLocaleString()}</strong></span>
            <span className={`pill ${proy.estado==="ejecucion"?"teal":proy.estado==="ganado"?"blue":"amber"}`}>
              {proy.estado}
            </span>
            {!cotVinc&&<span style={{fontSize:10,color:C.amber,fontWeight:600}}>⚠ Sin cotización ganada vinculada</span>}
          </div>
        )}
      </div>

      {/* -- Tabs -- */}
      <Tabs tabs={[
        {id:"solicitudes", lbl:"Recursos cotizados"},
        {id:"personal",    lbl:"Personal"},
        {id:"epp",         lbl:"EPP y equipos"},
        {id:"reqs",        lbl:"Requerimiento formal"},
      ]} active={tab} onChange={setTab}/>

      {/* ── Tab Recursos cotizados ── */}
      {tab==="solicitudes"&&(
        <div>
          {!cotVinc ? (
            <div className="card" style={{padding:32,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--t1)",marginBottom:4}}>
                Sin cotización ganada para {proy?.cliente}
              </div>
              <div style={{fontSize:12,color:"var(--t3)"}}>
                Este proyecto no tiene una cotización en estado "ganado" vinculada.
              </div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* Card resumen cotización */}
              <div className="card" style={{padding:16}}>
                <div className="card-hd">
                  <div>
                    <div className="ct">Cotización vinculada — {cotVinc.id}</div>
                    <div className="cs">{cotVinc.proyecto} · {cotVinc.fecha}</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span className="pill teal">Ganado</span>
                    <span style={{fontWeight:800,fontSize:14,color:C.teal,fontFamily:"var(--mono)"}}>
                      ${(cotVinc.venta||0).toLocaleString()} USD
                    </span>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,padding:"12px 0"}}>
                  {[
                    {l:"Personal",v:personalCot.reduce((a,p)=>a+(p.cant||1),0)+" personas",c:C.blue},
                    {l:"Horas totales",v:personalCot.reduce((a,p)=>a+(p.cant||1)*p.horas,0)+"h",c:C.navy},
                    {l:"EPP/Materiales",v:eppMostrar.length+" ítems",c:C.amber},
                    {l:"Equipos TI",v:equiposMostrar.filter(e=>e.cant!=="—").length+" tipos",c:C.teal},
                  ].map((k,i)=>(
                    <div key={i} style={{textAlign:"center",padding:"10px 8px",background:"var(--hv)",borderRadius:8}}>
                      <div style={{fontSize:18,fontWeight:800,color:k.c,fontFamily:"var(--mono)"}}>{k.v}</div>
                      <div style={{fontSize:10,color:"var(--t3)",marginTop:2}}>{k.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose personal */}
              {personalCot.length>0&&(
                <div className="card" style={{padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
                    👥 Personal requerido
                  </div>
                  <table>
                    <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>
                      {["Cargo","Cant.","Horas","Tarifa/h","Costo total"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",color:"#fff",fontWeight:600,textAlign:h==="Cargo"?"left":"right"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {personalCot.map((p,i)=>(
                        <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                          <td style={{fontWeight:600}}>{p.cargo}</td>
                          <td style={{textAlign:"right"}}>×{p.cant||1}</td>
                          <td style={{textAlign:"right",fontFamily:"var(--mono)"}}>{p.horas}h</td>
                          <td style={{textAlign:"right",fontFamily:"var(--mono)"}}>${p.tarifa}/h</td>
                          <td style={{textAlign:"right",fontFamily:"var(--mono)",fontWeight:700,color:C.navy}}>
                            ${((p.cant||1)*p.horas*p.tarifa).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Viáticos si existen */}
              {viaticosCot.length>0&&(
                <div className="card" style={{padding:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
                    🏨 Viáticos y fondos
                  </div>
                  <table>
                    <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>
                      {["Concepto","Personas","S/. por persona","Días","Total S/."].map(h=>(
                        <th key={h} style={{padding:"7px 10px",color:"#fff",fontWeight:600}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {viaticosCot.map((v,i)=>(
                        <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                          <td>{v.concepto||v.desc}</td>
                          <td style={{textAlign:"right"}}>{v.personas||1}</td>
                          <td style={{textAlign:"right",fontFamily:"var(--mono)"}}>S/ {(v.monto||v.usd||0).toLocaleString()}</td>
                          <td style={{textAlign:"right"}}>{v.dias||1}</td>
                          <td style={{textAlign:"right",fontFamily:"var(--mono)",fontWeight:700,color:C.teal}}>
                            S/ {((v.personas||1)*(v.monto||v.usd||0)*Math.max(v.dias||1,1)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab Personal ── */}
      {tab==="personal"&&(
        <div className="card" style={{padding:20}}>
          <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}}>
            Personal cotizado — {cotVinc?.id||"Sin cotización vinculada"}
          </div>
          {personalCot.length>0 ? (
            <>
              <table>
                <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>
                  {["Cargo","Cant.","Horas totales","Tarifa USD/h","Costo estimado","Días equiv."].map(h=>(
                    <th key={h} style={{padding:"7px 10px",color:"#fff",fontWeight:600,textAlign:h==="Cargo"?"left":"right"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {personalCot.map((p,i)=>(
                    <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                      <td style={{fontWeight:600,color:"var(--t1)"}}>{p.cargo}</td>
                      <td style={{textAlign:"right"}}><span className="pill blue" style={{fontSize:10}}>×{p.cant||1}</span></td>
                      <td style={{textAlign:"right",fontFamily:"var(--mono)",fontWeight:700}}>{p.horas}h</td>
                      <td style={{textAlign:"right",fontFamily:"var(--mono)"}}>${p.tarifa}</td>
                      <td style={{textAlign:"right",fontFamily:"var(--mono)",fontWeight:700,color:C.teal}}>
                        ${((p.cant||1)*p.horas*p.tarifa).toLocaleString("en-US",{maximumFractionDigits:0})}
                      </td>
                      <td style={{textAlign:"right",color:"var(--t3)",fontSize:11}}>
                        {Math.round((p.horas||0)/8)}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{marginTop:12,padding:"10px 14px",background:"rgba(26,46,74,.06)",borderRadius:"var(--r)",display:"flex",gap:24,fontSize:12}}>
                <span>Total personas: <strong style={{color:C.navy}}>{personalCot.reduce((a,p)=>a+(p.cant||1),0)}</strong></span>
                <span>Total horas: <strong style={{color:C.blue,fontFamily:"var(--mono)"}}>{personalCot.reduce((a,p)=>a+(p.cant||1)*p.horas,0)}h</strong></span>
                <span>Costo personal: <strong style={{color:C.teal,fontFamily:"var(--mono)"}}>
                  ${personalCot.reduce((a,p)=>a+(p.cant||1)*p.horas*p.tarifa,0).toLocaleString("en-US",{maximumFractionDigits:0})} USD
                </strong></span>
              </div>
            </>
          ) : (
            <div style={{textAlign:"center",padding:32,color:"var(--t3)"}}>
              No hay personal registrado en la cotización de este proyecto.
            </div>
          )}
        </div>
      )}

      {/* ── Tab EPP y Equipos ── */}
      {tab==="epp"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
              🦺 EPP y materiales {eppCot.length===0&&!formInicial?.epp?.some(e=>e.cant>0)&&<span style={{fontSize:9,color:C.amber,fontWeight:600,marginLeft:4}}>(estándar Aquarius)</span>}
            </div>
            <table>
              <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>
                {["Ítem","Categoría","Cant."].map(h=>(
                  <th key={h} style={{padding:"6px 10px",color:"#fff",fontWeight:600}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {eppMostrar.map((e,i)=>{
                  const hasTallas = (e.tallas||[]).length>0;
                  return(
                    <React.Fragment key={i}>
                      <tr style={{background:i%2===0?"transparent":"var(--hv)"}}>
                        <td style={{fontWeight:600,fontSize:12}}>{e.item||e.desc||e}</td>
                        <td style={{fontSize:11,color:"var(--t3)"}}>{e.cat||"General"}</td>
                        <td style={{textAlign:"center"}}>
                          {hasTallas
                            ? <span style={{fontSize:10,color:C.blue,fontWeight:600}}>{(e.tallas||[]).reduce((a,t)=>a+(t.cant||0),0)} uds (ver tallas)</span>
                            : "×"+(e.cant||1)
                          }
                        </td>
                      </tr>
                      {hasTallas&&(e.tallas||[]).map((t,ti)=>(
                        <tr key={"t"+ti} style={{background:"rgba(74,159,212,.04)"}}>
                          <td colSpan={2} style={{padding:"2px 10px 2px 24px",fontSize:10,color:"var(--t3)",fontStyle:"italic"}}>
                            ↳ Talla {t.talla||"—"}
                          </td>
                          <td style={{textAlign:"center",fontSize:10,fontWeight:700,color:C.blue}}>×{t.cant||1}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
              💻 Equipos tecnológicos
            </div>
            <table>
              <thead className="th-inv"><tr style={{background:"#1a2e4a"}}>
                {["Equipo","Cant.","Tipo","Estado"].map(h=>(
                  <th key={h} style={{padding:"6px 10px",color:"#fff",fontWeight:600}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {equiposMostrar.map((e,i)=>(
                  <tr key={i} style={{background:i%2===0?"transparent":"var(--hv)"}}>
                    <td style={{fontWeight:600,fontSize:12}}>{e.eq}</td>
                    <td style={{textAlign:"center"}}>×{e.cant}</td>
                    <td style={{fontSize:11,color:"var(--t3)"}}>{e.tipo}</td>
                    <td><span className={`pill ${e.estado==="asignado"?"teal":"amber"}`} style={{fontSize:9}}>{e.estado}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab Requerimiento formal ── */}
      {tab==="reqs"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Resumen del requerimiento */}
          <div className="card" style={{padding:20}}>
            <div className="card-hd">
              <div>
                <div className="ct">Requerimiento Formal — {proy?.cliente}</div>
                <div className="cs">Listo para enviar al área de Operaciones y RRHH</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-s btn-sm"
                  onClick={generarAnalisisIA} disabled={aiLoading}>
                  {aiLoading?"⏳ Analizando...":"🤖 Análisis IA"}
                </button>
                <button className="btn btn-p btn-sm" onClick={generarPDFRequerimiento}>
                  {I.dl} Descargar PDF
                </button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginTop:12}}>
              {[
                {l:"Cotización",v:cotVinc?.id||"—",c:C.blue},
                {l:"Valor contrato",v:"USD "+(cotVinc?.venta||proy?.valor||0).toLocaleString(),c:C.teal},
                {l:"Inicio estimado",v:proy?.inicio||"—",c:C.navy},
                {l:"Plazo",v:proy?.plazo||cotVinc?.plazo||"—",c:C.amber},
                {l:"Personal (cargos)",v:personalCot.length+" cargos / "+personalCot.reduce((a,p)=>a+(p.cant||1),0)+" personas",c:C.blue},
                {l:"Horas totales",v:personalCot.reduce((a,p)=>a+(p.cant||1)*p.horas,0)+"h",c:C.navy},
              ].map((k,i)=>(
                <div key={i} style={{padding:"10px 12px",background:"var(--hv)",borderRadius:8}}>
                  <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{k.l}</div>
                  <div style={{fontSize:13,fontWeight:700,color:k.c}}>{k.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Análisis IA */}
          {aiReq&&(
            <div className="card" style={{padding:16,border:`1px solid ${C.teal}30`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.teal,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
                🤖 Análisis IA — Recomendaciones para Operaciones
              </div>
              <div style={{fontSize:12,color:"var(--t1)",whiteSpace:"pre-line",lineHeight:1.7}}>
                {aiReq}
              </div>
            </div>
          )}
          {aiLoading&&(
            <div style={{padding:"24px",textAlign:"center",color:"var(--t3)",fontSize:12}}>
              ⏳ Generando análisis con Claude IA...
            </div>
          )}

          {/* Checklist de envío */}
          <div className="card" style={{padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>
              ✅ Checklist de envío
            </div>
            {[
              {ok:personalCot.length>0, txt:"Personal cotizado completo ("+personalCot.length+" cargos)"},
              {ok:true,                 txt:"EPP y materiales identificados ("+eppMostrar.length+" ítems)"},
              {ok:!!proy?.inicio,       txt:"Fecha de inicio definida"},
              {ok:!!cotVinc,            txt:"Cotización ganada vinculada ("+( cotVinc?.id||"—")+")"},
              {ok:!!aiReq,              txt:"Análisis IA generado"},
            ].map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",
                borderBottom:"1px solid var(--bd)",fontSize:12}}>
                <span style={{color:c.ok?C.teal:C.amber,fontWeight:700,flexShrink:0}}>
                  {c.ok?"✓":"○"}
                </span>
                <span style={{color:c.ok?"var(--t1)":"var(--t3)"}}>{c.txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// MANUAL DE USUARIO
// ==============================================================================
function ManualUsuario() {
  const descargarManual = () => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Manual de Usuario — Nexova CRM Pro v3.0</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
:root{
  --navy:#1a2e4a;  --blue:#1D9E75;  --teal:#1D9E75; --amber:#BA7517;
  --red:#E24B4A;   --surface:#F4F6F8; --bd:#E2E8F0; --card:#fff;
  --t1:#0F172A;    --t2:#334155;    --t3:#64748B;   --hv:#F4F6F8;
  --r:8px; --mono:monospace;
  --primary:#1D9E75; --accent:#1D9E75; --slate:#1a2e4a;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans','Segoe UI',system-ui,sans-serif;background:var(--surface);color:var(--t1);font-size:14px;line-height:1.6}
.cover{background:var(--navy);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;position:relative;overflow:hidden;page-break-after:always}
.cover::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 30%,rgba(74,159,212,.15) 0%,transparent 60%)}
.cover-logo{width:180px;margin-bottom:40px;filter:drop-shadow(0 4px 20px rgba(74,159,212,.3))}
.cover-title{font-size:52px;font-weight:900;color:#fff;letter-spacing:2px;text-align:center;margin-bottom:8px}
.cover-sub{font-size:22px;color:rgba(74,159,212,.9);font-weight:300;letter-spacing:4px;text-align:center;text-transform:uppercase;margin-bottom:6px}
.cover-sub2{font-size:14px;color:rgba(255,255,255,.4);letter-spacing:3px;text-transform:uppercase;margin-bottom:60px}
.cover-badges{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:40px}
.badge{padding:6px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.badge-blue{background:rgba(74,159,212,.15);color:var(--blue);border:1px solid rgba(74,159,212,.3)}
.badge-teal{background:rgba(29,158,117,.15);color:var(--teal);border:1px solid rgba(29,158,117,.3)}
.badge-amber{background:rgba(186,117,23,.15);color:var(--amber);border:1px solid rgba(186,117,23,.3)}
.cover-meta{text-align:center;color:rgba(255,255,255,.3);font-size:12px;letter-spacing:1px;border-top:1px solid rgba(255,255,255,.08);padding-top:24px;width:100%;max-width:600px}
.container{max-width:960px;margin:0 auto;padding:40px 32px}
.page-break{page-break-before:always}
.toc{background:#fff;border:1px solid var(--bd);border-radius:12px;padding:32px;margin-bottom:40px}
.toc-title{font-size:18px;font-weight:800;color:var(--navy);margin-bottom:20px;display:flex;align-items:center;gap:10px}
.toc-title::before{content:'';display:block;width:4px;height:24px;background:var(--blue);border-radius:2px}
.toc-section{margin-bottom:4px}
.toc-h1{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:6px;cursor:pointer;text-decoration:none;color:var(--navy);font-weight:700;font-size:14px;transition:background .15s}
.toc-h1:hover{background:rgba(74,159,212,.06)}
.toc-h2{display:flex;align-items:center;justify-content:space-between;padding:4px 10px 4px 28px;border-radius:4px;text-decoration:none;color:var(--t2);font-size:13px;transition:background .15s}
.toc-h2:hover{background:rgba(74,159,212,.04);color:var(--blue)}
.toc-dot{flex:1;border-bottom:1px dotted var(--bd);margin:0 8px}
.toc-num{font-size:12px;color:var(--t3);font-weight:600;min-width:24px;text-align:right}
h1.section-title{font-size:28px;font-weight:900;color:var(--navy);margin-bottom:6px;padding-top:48px}
.section-line{height:3px;background:linear-gradient(90deg,var(--blue),transparent);border-radius:2px;margin-bottom:24px}
h2.sub-title{font-size:18px;font-weight:700;color:var(--navy);margin:28px 0 12px;display:flex;align-items:center;gap:8px}
h2.sub-title::before{content:'';display:block;width:3px;height:20px;background:var(--blue);border-radius:2px;flex-shrink:0}
h3.sub-sub{font-size:14px;font-weight:700;color:var(--t2);margin:20px 0 8px;text-transform:uppercase;letter-spacing:.5px}
.card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;margin-bottom:16px}
.card-navy{border-left:4px solid var(--navy)}
.card-blue{border-left:4px solid var(--blue)}
.card-teal{border-left:4px solid var(--teal)}
.card-amber{border-left:4px solid var(--amber)}
.card-red{border-left:4px solid var(--red)}
.modulos-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
.modulo-card{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:18px;transition:all .2s}
.modulo-card:hover{border-color:var(--blue);box-shadow:0 4px 16px rgba(74,159,212,.1)}
.modulo-icon{font-size:28px;margin-bottom:8px}
.modulo-name{font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px}
.modulo-desc{font-size:12px;color:var(--t3);line-height:1.5}
.modulo-roles{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.role-tag{font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;background:rgba(74,159,212,.08);color:var(--blue);border:1px solid rgba(74,159,212,.2)}
.steps{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:16px;padding:16px 0;border-bottom:1px solid var(--bd)}
.step:last-child{border-bottom:none}
.step-num{width:36px;height:36px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0;margin-top:2px}
.step-content{flex:1}
.step-title{font-size:14px;font-weight:700;color:var(--t1);margin-bottom:4px}
.step-desc{font-size:13px;color:var(--t2);line-height:1.6}
.flowchart{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:24px;margin:20px 0;text-align:center}
.alert{border-radius:8px;padding:14px 18px;margin:12px 0;display:flex;gap:10px;align-items:flex-start;font-size:13px}
.alert-icon{font-size:16px;flex-shrink:0;margin-top:1px}
.alert-critico{background:rgba(226,75,74,.08);border:1px solid rgba(226,75,74,.25);color:#9b2c2c}
.alert-alerta{background:rgba(186,117,23,.08);border:1px solid rgba(186,117,23,.25);color:#744210}
.alert-info{background:rgba(74,159,212,.08);border:1px solid rgba(74,159,212,.25);color:#1e3a5f}
.alert-exito{background:rgba(29,158,117,.08);border:1px solid rgba(29,158,117,.25);color:#134e3c}
.alert strong{font-weight:700}
table.manual-table{width:100%;border-collapse:collapse;font-size:13px;margin:16px 0}
table.manual-table th{background:var(--navy);color:#fff;padding:10px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.3px}
table.manual-table td{padding:9px 14px;border-bottom:1px solid var(--bd);color:var(--t2);vertical-align:top}
table.manual-table tr:nth-child(even) td{background:#f8fafc}
table.manual-table tr:hover td{background:rgba(74,159,212,.04)}
.roles-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0}
.role-card{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:16px}
.role-title{font-size:13px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.role-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.role-list{list-style:none;padding:0}
.role-list li{font-size:12px;color:var(--t2);padding:2px 0;display:flex;gap:6px}
.role-list li::before{content:'✓';color:var(--teal);font-weight:700;flex-shrink:0}
.shortcuts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}
.shortcut{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fff;border:1px solid var(--bd);border-radius:6px}
.kbd{font-family:monospace;font-size:11px;background:var(--navy);color:#fff;padding:2px 8px;border-radius:4px;font-weight:700}
.shortcut-desc{font-size:12px;color:var(--t2)}
.pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700}
.pill-blue{background:rgba(74,159,212,.12);color:var(--blue)}
.pill-teal{background:rgba(29,158,117,.12);color:var(--teal)}
.pill-amber{background:rgba(186,117,23,.12);color:var(--amber)}
.pill-red{background:rgba(226,75,74,.12);color:var(--red)}
.pill-navy{background:rgba(26,46,74,.1);color:var(--navy)}
footer{background:var(--navy);color:rgba(255,255,255,.4);text-align:center;padding:24px;font-size:12px;margin-top:60px}
footer strong{color:rgba(255,255,255,.7)}
.page-header{display:flex;align-items:center;justify-content:space-between;padding:12px 0 12px;border-bottom:2px solid var(--blue);margin-bottom:32px}
.page-header img{height:36px;width:auto}
.page-header-title{font-size:11px;color:var(--t3);text-align:right;line-height:1.5}
.page-header-title strong{color:var(--navy);font-size:12px}
@media print{
  .page-header{position:running(header)}
}
@media print{
  .cover{min-height:auto;padding:40px}
  .container{padding:24px}
  h1.section-title{padding-top:24px}
  .page-break{page-break-before:always}
  a{text-decoration:none;color:inherit}
}
code{background:#f1f5f9;border:1px solid var(--bd);border-radius:4px;padding:1px 6px;font-family:monospace;font-size:12px;color:var(--navy)}
.divider{border:none;border-top:2px solid var(--bd);margin:40px 0}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}
.kpi-box{background:#fff;border:1px solid var(--bd);border-radius:8px;padding:16px;text-align:center}
.kpi-val{font-size:32px;font-weight:900;color:var(--blue)}
.kpi-lbl{font-size:12px;color:var(--t3);margin-top:4px}
</style>
</head>
<body>

<!-- PORTADA -->
<div class="cover">
  <div style="width:200px;height:80px;background:rgba(15,118,110,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:40px"><span style="color:#1D9E75;font-size:18px;font-weight:700">NEXOVA</span></div>
  <div class="cover-title">NEXOVA CRM PRO</div>
  <div class="cover-sub">Manual de Usuario</div>
  <div class="cover-sub2">Sistema de Gestión Interna · Versión 3.1 · Act. ${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"})}</div>
  <div class="cover-badges">
    <span class="badge badge-blue">16 Módulos activos</span>
    <span class="badge badge-teal">IA Integrada — Claude API</span>
    <span class="badge badge-amber">7 Roles de usuario</span>
  </div>
  <div class="cover-meta">
    Nexova CRM Pro · NEXOVA · Lima, Perú · Confidencial<br/>
    Desarrollado por NEXOVA — Wilmer Moreno V. · nexova.pe · 2026
  </div>
</div>

<!-- CONTENIDO -->
<div class="container">

<!-- HEADER DE PÁGINA con logo real -->
<div class="page-header">
  <span style="font-family:'Sora',sans-serif;font-size:14px;font-weight:900;color:#1D9E75">NEXOVA</span>
  <div class="page-header-title">
    <strong>Manual de Usuario — Nexova CRM Pro v3.0</strong><br/>
    Nexova CRM Pro · nexova.pe · Confidencial · Act. ${new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"})}
  </div>
</div>

<!-- TOC -->
<div class="toc" id="toc">
  <div class="toc-title">Tabla de Contenidos</div>
  <div class="toc-section"><a class="toc-h1" href="#s1"><span>1. Introducción y visión general</span><span class="toc-dot"></span><span class="toc-num">01</span></a><a class="toc-h2" href="#s1-1"><span>1.1 ¿Qué es Nexova CRM Pro?</span><span class="toc-dot"></span><span class="toc-num">01</span></a><a class="toc-h2" href="#s1-2"><span>1.2 Arquitectura del sistema</span><span class="toc-dot"></span><span class="toc-num">02</span></a><a class="toc-h2" href="#s1-3"><span>1.3 Mapa de módulos</span><span class="toc-dot"></span><span class="toc-num">02</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s2"><span>2. Acceso y roles de usuario</span><span class="toc-dot"></span><span class="toc-num">04</span></a><a class="toc-h2" href="#s2-1"><span>2.1 Login y acceso rápido</span><span class="toc-dot"></span><span class="toc-num">04</span></a><a class="toc-h2" href="#s2-2"><span>2.2 Roles y permisos</span><span class="toc-dot"></span><span class="toc-num">05</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s3"><span>3. Dashboard Gerencial</span><span class="toc-dot"></span><span class="toc-num">06</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s4"><span>4. Módulo CRM — Pipeline Comercial</span><span class="toc-dot"></span><span class="toc-num">08</span></a><a class="toc-h2" href="#s4-1"><span>4.1 Pipeline Kanban</span><span class="toc-dot"></span><span class="toc-num">08</span></a><a class="toc-h2" href="#s4-2"><span>4.2 Seguimiento automatizado</span><span class="toc-dot"></span><span class="toc-num">09</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s5"><span>5. Rentabilidad y Cotizaciones</span><span class="toc-dot"></span><span class="toc-num">11</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s6"><span>6. Módulo Ejecución de Proyectos</span><span class="toc-dot"></span><span class="toc-num">13</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s7"><span>7. Facturación y Cobros</span><span class="toc-dot"></span><span class="toc-num">15</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s8"><span>8. Propuestas Comerciales</span><span class="toc-dot"></span><span class="toc-num">16</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s9"><span>9. Gestión de Recursos (unificado)</span><span class="toc-dot"></span><span class="toc-num">17</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s10"><span>10. RRHH — Gestión de Personal</span><span class="toc-dot"></span><span class="toc-num">18</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s11"><span>11. Control de Calidad</span><span class="toc-dot"></span><span class="toc-num">19</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s12"><span>12. Reportería Avanzada</span><span class="toc-dot"></span><span class="toc-num">20</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s13"><span>13. Notificaciones e Integraciones</span><span class="toc-dot"></span><span class="toc-num">21</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s14"><span>14. Asistente IA y Análisis</span><span class="toc-dot"></span><span class="toc-num">22</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s15"><span>15. Motor de Alertas</span><span class="toc-dot"></span><span class="toc-num">23</span></a></div>
  <div class="toc-section"><a class="toc-h1" href="#s16"><span>16. Configuración y Administración</span><span class="toc-dot"></span><span class="toc-num">24</span></a></div>
</div>

<!-- ==== S1 ==== -->
<h1 class="section-title" id="s1">1. Introducción y visión general</h1>
<div class="section-line"></div>

<h2 class="sub-title" id="s1-1">1.1 ¿Qué es Nexova CRM Pro?</h2>
<div class="card card-navy">
  <p><strong>Nexova CRM Pro v3.0</strong> es el sistema SaaS interno de NEXOVA — plataforma integral para gestión comercial, ejecución de proyectos de inventario y conciliación de activos fijos, control presupuestal, reportería gerencial y asistencia con IA. Cubre el ciclo completo: desde la captación de un lead hasta el cierre del proyecto y cobro final.</p>
</div>

<div class="alert alert-info">
  <span class="alert-icon">💡</span>
  <div><strong>Novedad v3.0:</strong> Gestión de Recursos unificada (Requerimientos + Recursos en campo), Notificaciones como panel flotante en la campana del Header, Selector de período Mensual/Trimestral/Anual en Dashboard y Reportes, y todos los PDFs con gráficas SVG profesionales.</div>
</div>

<h2 class="sub-title" id="s1-2">1.2 Arquitectura del sistema</h2>
<div class="card">
  <table class="manual-table">
    <thead><tr><th>Capa</th><th>Tecnología</th><th>Descripción</th></tr></thead>
    <tbody>
      <tr><td><strong>Frontend</strong></td><td>React 18 + Recharts</td><td>Interfaz de usuario, gráficas y dashboards interactivos</td></tr>
      <tr><td><strong>Persistencia</strong></td><td>window.storage API</td><td>Almacenamiento de datos del usuario por sesión</td></tr>
      <tr><td><strong>Inteligencia Artificial</strong></td><td>Claude API (claude-sonnet-4-20250514)</td><td>Asistente conversacional y análisis de rentabilidad</td></tr>
      <tr><td><strong>Exportación</strong></td><td>HTML/PDF + SpreadsheetML</td><td>PDFs con gráficas SVG y Excel nativo sin dependencias</td></tr>
      <tr><td><strong>Hosting</strong></td><td>Replit (Vite)</td><td>Despliegue continuo en la nube</td></tr>
    </tbody>
  </table>
</div>

<!-- Flujograma arquitectura -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Flujo de datos del sistema</div>
  <svg viewBox="0 0 740 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:740px">
    <defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker>
    <marker id="arrB" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#4a9fd4"/></marker></defs>
    <rect x="5" y="40" width="110" height="40" rx="8" fill="#1a2e4a"/>
    <text x="60" y="56" text-anchor="middle" font-size="10" fill="white" font-weight="700">👤 Usuario</text>
    <text x="60" y="72" text-anchor="middle" font-size="9" fill="#94a3b8">7 roles</text>
    <line x1="115" y1="60" x2="155" y2="60" stroke="#4a9fd4" stroke-width="2" marker-end="url(#arrB)"/>
    <rect x="160" y="30" width="130" height="60" rx="8" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="225" y="54" text-anchor="middle" font-size="11" fill="#1a2e4a" font-weight="700">⚛️ React 18</text>
    <text x="225" y="70" text-anchor="middle" font-size="9" fill="#64748b">16 módulos</text>
    <text x="225" y="84" text-anchor="middle" font-size="9" fill="#64748b">Recharts + SVG</text>
    <line x1="290" y1="45" x2="330" y2="35" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="290" y1="60" x2="330" y2="60" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="290" y1="75" x2="330" y2="85" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <rect x="334" y="15" width="120" height="30" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"/>
    <text x="394" y="35" text-anchor="middle" font-size="10" fill="#134e3c" font-weight="600">💾 window.storage</text>
    <rect x="334" y="50" width="120" height="30" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"/>
    <text x="394" y="70" text-anchor="middle" font-size="10" fill="#92400e" font-weight="600">🤖 Claude API</text>
    <rect x="334" y="85" width="120" height="30" rx="6" fill="rgba(74,159,212,.1)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="394" y="105" text-anchor="middle" font-size="10" fill="#1e3a5f" font-weight="600">📄 PDF / Excel export</text>
    <line x1="454" y1="30" x2="494" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="454" y1="65" x2="494" y2="60" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="454" y1="100" x2="494" y2="65" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
    <rect x="498" y="40" width="110" height="40" rx="8" fill="#1a2e4a"/>
    <text x="553" y="56" text-anchor="middle" font-size="10" fill="white" font-weight="700">🌐 Replit</text>
    <text x="553" y="72" text-anchor="middle" font-size="9" fill="#94a3b8">Vite / SaaS</text>
    <line x1="608" y1="60" x2="648" y2="60" stroke="#4a9fd4" stroke-width="2" marker-end="url(#arrB)"/>
    <rect x="652" y="40" width="80" height="40" rx="8" fill="#4a9fd4"/>
    <text x="692" y="56" text-anchor="middle" font-size="10" fill="white" font-weight="700">📱 Browser</text>
    <text x="692" y="72" text-anchor="middle" font-size="9" fill="#e0f2fe">Chrome/Edge</text>
  </svg>
</div>

<h2 class="sub-title" id="s1-3">1.3 Mapa de módulos</h2>
<div class="modulos-grid">
  <div class="modulo-card"><div class="modulo-icon">📊</div><div class="modulo-name">Dashboard Gerencial</div><div class="modulo-desc">KPIs, widgets drag&drop, período Mensual/Trimestral/Anual, alertas, PDF ejecutivo</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Gerencia</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">🎯</div><div class="modulo-name">CRM Pipeline</div><div class="modulo-desc">Leads Kanban, score, actividades, follow-up automatizado, navegación a cotizaciones</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Comercial</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">💰</div><div class="modulo-name">Cotizaciones</div><div class="modulo-desc">Calculadora con 19 tarifas, personal, EPP, gastos, margen automático, análisis IA</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Comercial</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">📋</div><div class="modulo-name">Propuestas</div><div class="modulo-desc">Pipeline de propuestas, estados, memorándum AF/Existencias con Gantt SVG</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Comercial</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">🚀</div><div class="modulo-name">Ejecución</div><div class="modulo-desc">Gantt 9 fases, entregables, control de horas, cobros, documentos por proyecto</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Jefe Proyecto</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">🏗️</div><div class="modulo-name">Gestión de Recursos</div><div class="modulo-desc">2 tabs: Recursos en campo (EPP, equipos, solicitudes) y Requerimientos (5 formularios)</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Operaciones</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">✅</div><div class="modulo-name">Control de Calidad</div><div class="modulo-desc">Inventario físico, activos conformes/faltantes/sobrantes/deteriorados</div><div class="modulo-roles"><span class="role-tag">Jefe Proyecto</span><span class="role-tag">Consultor</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">📈</div><div class="modulo-name">Control Presupuestal</div><div class="modulo-desc">Real vs cotizado por rubros, variaciones, alertas de sobrecosto</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Jefe Proyecto</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">🧾</div><div class="modulo-name">Facturación y Cobros</div><div class="modulo-desc">Facturas emitidas, estados, flujo de caja, cobranza por cliente</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Gerencia</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">📑</div><div class="modulo-name">Reportería</div><div class="modulo-desc">12 reportes R01–R12, período Mensual/Trimestral/Anual, PDF+Excel con gráficas</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">Gerencia</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">👥</div><div class="modulo-name">RRHH</div><div class="modulo-desc">Directorio de consultores, carga horaria, disponibilidad, evaluaciones</div><div class="modulo-roles"><span class="role-tag">Admin</span><span class="role-tag">RRHH</span></div></div>
  <div class="modulo-card"><div class="modulo-icon">🤖</div><div class="modulo-name">Asistente IA</div><div class="modulo-desc">Chat con Claude API: análisis de rentabilidad, consultas de proyectos y leads</div><div class="modulo-roles"><span class="role-tag">Todos</span></div></div>
</div>

<hr class="divider"/>

<!-- ==== S2 ==== -->
<h1 class="section-title" id="s2">2. Acceso y Roles de Usuario</h1>
<div class="section-line"></div>

<h2 class="sub-title" id="s2-1">2.1 Login y panel de acceso rápido</h2>
<div class="steps">
  <div class="step"><div class="step-num">1</div><div class="step-content"><div class="step-title">Ingresar credenciales</div><div class="step-desc">Escribir correo institucional (@aquarius.pe) y contraseña en el formulario de login.</div></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-content"><div class="step-title">Selección rápida (modo demo)</div><div class="step-desc">Clic en cualquier tarjeta de usuario del panel derecho para ingresar automáticamente con ese rol sin escribir contraseña.</div></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-content"><div class="step-title">Redirección por rol</div><div class="step-desc">El sistema redirige automáticamente al módulo de inicio según el rol: Admin→Dashboard, Comercial→CRM, Jefe Proyecto→Ejecución, Consultor→Ejecución, Operaciones→Recursos, RRHH→RRHH.</div></div></div>
</div>

<h2 class="sub-title" id="s2-2">2.2 Roles y permisos</h2>
<div class="roles-grid">
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#e74c3c"></span>Admin (Wilmer Moreno V.)</div><ul class="role-list"><li>Acceso a todos los módulos</li><li>Gestión de usuarios y roles</li><li>Configuración de tarifas</li><li>Restablecer datos del sistema</li></ul></div>
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#27ae60"></span>Comercial</div><ul class="role-list"><li>Dashboard, CRM, Cotizaciones</li><li>Propuestas comerciales</li><li>Manual de usuario</li></ul></div>
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#2980b9"></span>Jefe de Proyecto</div><ul class="role-list"><li>Ejecución, Presupuesto, Recursos</li><li>Control de Calidad</li><li>Dashboard de proyectos</li></ul></div>
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#16a085"></span>Consultor</div><ul class="role-list"><li>Ejecución del proyecto asignado</li><li>Control de Calidad</li><li>Manual de usuario</li></ul></div>
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#e67e22"></span>Operaciones</div><ul class="role-list"><li>Recursos, Ejecución</li><li>Control de Calidad</li></ul></div>
  <div class="role-card"><div class="role-title"><span class="role-dot" style="background:#8e44ad"></span>Gerencia</div><ul class="role-list"><li>Dashboard, reportes ejecutivos</li><li>Ejecución, Facturación, Propuestas</li></ul></div>
</div>

<!-- Flujograma de acceso -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Flujo de login y redirección por rol</div>
  <svg viewBox="0 0 700 110" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:700px">
    <defs><marker id="a2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="35" width="110" height="40" rx="8" fill="#1a2e4a"/>
    <text x="60" y="51" text-anchor="middle" font-size="10" fill="white" font-weight="700">👤 Usuario</text>
    <text x="60" y="67" text-anchor="middle" font-size="9" fill="#94a3b8">ingresa credenciales</text>
    <line x1="115" y1="55" x2="155" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <rect x="159" y="35" width="110" height="40" rx="8" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="214" y="51" text-anchor="middle" font-size="10" fill="#1a2e4a" font-weight="700">🔐 Validación</text>
    <text x="214" y="67" text-anchor="middle" font-size="9" fill="#64748b">email + contraseña</text>
    <line x1="269" y1="45" x2="319" y2="25" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <line x1="269" y1="55" x2="319" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <line x1="269" y1="65" x2="319" y2="85" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <rect x="323" y="10" width="90" height="24" rx="5" fill="#FEE2E2" stroke="#FCA5A5"/>
    <text x="368" y="27" text-anchor="middle" font-size="9" fill="#991b1b" font-weight="600">Admin → Dashboard</text>
    <rect x="323" y="43" width="90" height="24" rx="5" fill="#D1FAE5" stroke="#6EE7B7"/>
    <text x="368" y="60" text-anchor="middle" font-size="9" fill="#134e3c" font-weight="600">Comercial → CRM</text>
    <rect x="323" y="73" width="90" height="24" rx="5" fill="rgba(74,159,212,.1)" stroke="#4a9fd4"/>
    <text x="368" y="90" text-anchor="middle" font-size="9" fill="#1e3a5f" font-weight="600">Jefe Proy. → Ejecución</text>
    <line x1="413" y1="22" x2="463" y2="50" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <line x1="413" y1="55" x2="463" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <line x1="413" y1="85" x2="463" y2="60" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <rect x="467" y="35" width="110" height="40" rx="8" fill="#1D9E75"/>
    <text x="522" y="51" text-anchor="middle" font-size="10" fill="white" font-weight="700">✅ Módulo</text>
    <text x="522" y="67" text-anchor="middle" font-size="9" fill="#e0f2fe">de inicio por rol</text>
    <line x1="577" y1="55" x2="617" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a2)"/>
    <rect x="621" y="35" width="74" height="40" rx="8" fill="#BA7517"/>
    <text x="658" y="51" text-anchor="middle" font-size="10" fill="white" font-weight="700">🏠 Menú</text>
    <text x="658" y="67" text-anchor="middle" font-size="9" fill="#fff8e1">sidebar</text>
  </svg>
</div>

<hr class="divider"/>

<!-- ==== S3 ==== -->
<h1 class="section-title" id="s3">3. Dashboard Gerencial</h1>
<div class="section-line"></div>

<div class="card card-navy">
  <p>Vista ejecutiva consolidada. Disponible para <strong>Admin</strong> y <strong>Gerencia</strong>. Combina KPIs, gráficas Recharts, alertas activas y widgets arrastrables. Incluye selector de período <strong>Mensual / Trimestral / Anual</strong> que afecta la gráfica histórica y el PDF generado.</p>
</div>

<table class="manual-table">
  <thead><tr><th>Widget</th><th>Descripción</th><th>Período</th></tr></thead>
  <tbody>
    <tr><td><strong>KPIs Principales</strong></td><td>Pipeline activo, proyectos, contratado 2026, margen promedio, alertas críticas</td><td>Global</td></tr>
    <tr><td><strong>KPIs Secundarios</strong></td><td>Cobrado 2026, por cobrar, entregables pendientes, Win Rate MTD</td><td>Global</td></tr>
    <tr><td><strong>Ingresos vs Pipeline</strong></td><td>Barras + línea — filtradas por período seleccionado (1/3/6 meses)</td><td>✅ Filtrado</td></tr>
    <tr><td><strong>Comparativo Trimestral</strong></td><td>Ingresos, costos y margen Q1 2025 → Q1 2026</td><td>Global</td></tr>
    <tr><td><strong>Forecast 90 días</strong></td><td>Proyección de ingresos próximos 3 meses con tendencia +12%/mes</td><td>Global</td></tr>
    <tr><td><strong>Motor de Alertas</strong></td><td>Alertas activas con filtro por nivel de criticidad</td><td>Global</td></tr>
    <tr><td><strong>Proyectos en Ejecución</strong></td><td>Tabla completa: valor, fase, avance, margen, estado cobro</td><td>Global</td></tr>
  </tbody>
</table>

<div class="alert alert-info">
  <span class="alert-icon">💡</span>
  <div><strong>Drag &amp; Drop:</strong> Arrastra cualquier widget por el ícono ⠿ para reorganizar el layout. Se guarda automáticamente por usuario.<br/>
  <strong>Selector de período:</strong> El dropdown Mensual/Trimestral/Anual en el header afecta la gráfica histórica y el PDF descargado — el título del PDF cambia según el período seleccionado.</div>
</div>

<hr class="divider"/>

<!-- ==== S4 ==== -->
<h1 class="section-title" id="s4">4. Módulo CRM — Pipeline Comercial</h1>
<div class="section-line"></div>

<div class="card card-blue">
  <p>Gestiona el ciclo de ventas completo. Tiene 3 vistas: <strong>Pipeline Kanban</strong>, <strong>Tabla</strong> y <strong>Galería de servicios</strong>. El botón "Cotización" en la ficha de un lead navega directamente al módulo de Cotizaciones (sin duplicar modales).</p>
</div>

<h2 class="sub-title" id="s4-1">4.1 Pipeline Kanban</h2>

<!-- Flujograma etapas del pipeline -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Etapas del Pipeline Comercial</div>
  <svg viewBox="0 0 720 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:720px">
    <defs><marker id="a3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="20" width="110" height="40" rx="8" fill="#94a3b8"/>
    <text x="60" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">1. Prospecto</text>
    <text x="60" y="52" text-anchor="middle" font-size="9" fill="#f8fafc">Primer contacto</text>
    <line x1="115" y1="40" x2="145" y2="40" stroke="#94a3b8" stroke-width="2" marker-end="url(#a3)"/>
    <rect x="149" y="20" width="110" height="40" rx="8" fill="#4a9fd4"/>
    <text x="204" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">2. Calificado</text>
    <text x="204" y="52" text-anchor="middle" font-size="9" fill="#e0f2fe">Necesidad confirmada</text>
    <line x1="259" y1="40" x2="289" y2="40" stroke="#94a3b8" stroke-width="2" marker-end="url(#a3)"/>
    <rect x="293" y="20" width="110" height="40" rx="8" fill="#BA7517"/>
    <text x="348" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">3. Propuesta</text>
    <text x="348" y="52" text-anchor="middle" font-size="9" fill="#fef3c7">Cotización enviada</text>
    <line x1="403" y1="40" x2="433" y2="40" stroke="#94a3b8" stroke-width="2" marker-end="url(#a3)"/>
    <rect x="437" y="20" width="110" height="40" rx="8" fill="#7c3aed"/>
    <text x="492" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">4. Negociación</text>
    <text x="492" y="52" text-anchor="middle" font-size="9" fill="#f5f3ff">Ajuste condiciones</text>
    <line x1="547" y1="40" x2="577" y2="40" stroke="#94a3b8" stroke-width="2" marker-end="url(#a3)"/>
    <rect x="581" y="20" width="110" height="40" rx="8" fill="#1D9E75"/>
    <text x="636" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">5. Cerrado ✓</text>
    <text x="636" y="52" text-anchor="middle" font-size="9" fill="#d1fae5">Contrato firmado</text>
    <text x="636" y="64" text-anchor="middle" font-size="8" fill="#d1fae5">→ abre proyecto</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Acción</th><th>Cómo hacerlo</th></tr></thead>
  <tbody>
    <tr><td>Crear lead</td><td>Botón <strong>+ Nuevo lead</strong> en el header → formulario con empresa, contacto, valor, servicio y etapa</td></tr>
    <tr><td>Mover de etapa</td><td>Arrastrar la tarjeta Kanban a la columna destino, o editar el campo "Etapa" en la ficha</td></tr>
    <tr><td>Registrar actividad</td><td>Clic en el lead → botón <strong>+ Actividad</strong> → tipo (llamada, reunión, email, WhatsApp, tarea) + texto</td></tr>
    <tr><td>Crear cotización</td><td>Clic en el lead → botón <strong>Cotización</strong> → navega al módulo Cotizaciones con los datos del cliente</td></tr>
    <tr><td>Follow-up automático</td><td>Botón <strong>Follow-up</strong> → seleccionar plantilla → editar asunto y cuerpo → copiar o enviar</td></tr>
  </tbody>
</table>

<h2 class="sub-title" id="s4-2">4.2 Seguimiento automatizado</h2>
<table class="manual-table">
  <thead><tr><th>Plantilla</th><th>Etapa</th><th>Días sugeridos</th></tr></thead>
  <tbody>
    <tr><td>T01 — Seguimiento propuesta</td><td><span class="pill pill-amber">Propuesta</span></td><td>3 días post-envío</td></tr>
    <tr><td>T02 — Segunda revisión</td><td><span class="pill pill-amber">Propuesta</span></td><td>7 días post-envío</td></tr>
    <tr><td>T03 — Propuesta lista</td><td><span class="pill pill-blue">Calificado</span></td><td>5 días</td></tr>
    <tr><td>T04 — Pendientes negociación</td><td><span class="pill pill-navy">Negociación</span></td><td>2 días</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S5 ==== -->
<h1 class="section-title" id="s5">5. Rentabilidad y Cotizaciones</h1>
<div class="section-line"></div>

<div class="card card-teal">
  <p>Calculadora de cotizaciones con <strong>19 tarifas por cargo</strong>, control de EPP, gastos directos y cálculo automático de margen. Integra análisis de rentabilidad con IA (Claude API). Los PDFs generados incluyen gráfica de donut de margen, tablas de personal, EPP y gastos.</p>
</div>

<h2 class="sub-title">Flujo de trabajo — Calculadora de cotizaciones</h2>
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Proceso de cotización</div>
  <svg viewBox="0 0 700 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:700px">
    <defs><marker id="a4" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="45" width="100" height="40" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="55" y="61" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">① Datos</text>
    <text x="55" y="75" text-anchor="middle" font-size="9" fill="#64748b">cliente, servicio</text>
    <line x1="105" y1="65" x2="135" y2="65" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a4)"/>
    <rect x="139" y="45" width="100" height="40" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="189" y="61" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">② Personal</text>
    <text x="189" y="75" text-anchor="middle" font-size="9" fill="#64748b">cargos + horas</text>
    <line x1="239" y1="65" x2="269" y2="65" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a4)"/>
    <rect x="273" y="45" width="100" height="40" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="323" y="61" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">③ EPP + Gastos</text>
    <text x="323" y="75" text-anchor="middle" font-size="9" fill="#64748b">materiales, viáticos</text>
    <line x1="373" y1="65" x2="403" y2="65" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a4)"/>
    <rect x="407" y="35" width="120" height="60" rx="6" fill="#1a2e4a"/>
    <text x="467" y="56" text-anchor="middle" font-size="10" fill="white" font-weight="700">⚡ Cálculo</text>
    <text x="467" y="70" text-anchor="middle" font-size="9" fill="#94a3b8">margen automático</text>
    <text x="467" y="84" text-anchor="middle" font-size="9" fill="#4a9fd4">obj. ISO ≥ 30%</text>
    <line x1="527" y1="55" x2="557" y2="30" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a4)"/>
    <line x1="527" y1="75" x2="557" y2="100" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a4)"/>
    <rect x="561" y="15" width="130" height="30" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"/>
    <text x="626" y="35" text-anchor="middle" font-size="9" fill="#134e3c" font-weight="600">✅ Guardar + PDF + IA</text>
    <rect x="561" y="85" width="130" height="30" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"/>
    <text x="626" y="105" text-anchor="middle" font-size="9" fill="#92400e" font-weight="600">⚠️ Ajustar margen</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Semáforo de margen</th><th>Rango</th><th>Acción recomendada</th></tr></thead>
  <tbody>
    <tr><td><span class="pill pill-teal">🟢 Óptimo</span></td><td>≥ 30%</td><td>Enviar cotización — supera objetivo ISO 9001</td></tr>
    <tr><td><span class="pill pill-blue">🔵 Aceptable</span></td><td>22% – 29%</td><td>Enviar con nota — verificar estructura de costos</td></tr>
    <tr><td><span class="pill pill-amber">🟡 Bajo</span></td><td>15% – 21%</td><td>Revisar tarifas y gastos antes de enviar</td></tr>
    <tr><td><span class="pill pill-red">🔴 Crítico</span></td><td>&lt; 15%</td><td>No enviar — solicitar aprobación de gerencia</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S6 ==== -->
<h1 class="section-title" id="s6">6. Módulo Ejecución de Proyectos</h1>
<div class="section-line"></div>

<div class="card card-navy">
  <p>Control completo del ciclo de vida de cada proyecto. 5 tabs: <strong>Gantt</strong>, <strong>Entregables</strong>, <strong>Horas</strong>, <strong>Cobros</strong> y <strong>Documentos</strong>. Todos los PDFs incluyen gráficas SVG profesionales.</p>
</div>

<!-- Flujograma fases -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:12px;font-size:15px">Fases estándar de un proyecto Aquarius</div>
  <svg viewBox="0 0 720 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:720px">
    <defs><marker id="a5" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#4a9fd4"/></marker></defs>
    <!-- Fase 1 -->
    <rect x="5" y="10" width="200" height="36" rx="6" fill="#1a2e4a"/>
    <text x="105" y="24" text-anchor="middle" font-size="10" fill="white" font-weight="700">F1. Planeamiento inventario</text>
    <text x="105" y="38" text-anchor="middle" font-size="8" fill="#94a3b8">Cronograma · Catálogo AF · Maestros</text>
    <line x1="105" y1="46" x2="105" y2="60" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <!-- Fase 2 -->
    <rect x="5" y="64" width="200" height="36" rx="6" fill="#1a2e4a"/>
    <text x="105" y="78" text-anchor="middle" font-size="10" fill="white" font-weight="700">F2. Inventario físico + Calidad</text>
    <text x="105" y="92" text-anchor="middle" font-size="8" fill="#94a3b8">Reportes por tipo · CC · Responsable</text>
    <line x1="105" y1="100" x2="105" y2="114" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <!-- Fase 3 -->
    <rect x="5" y="118" width="200" height="36" rx="6" fill="#243d5c"/>
    <text x="105" y="132" text-anchor="middle" font-size="10" fill="white" font-weight="700">F3. Planeamiento contable</text>
    <text x="105" y="146" text-anchor="middle" font-size="8" fill="#94a3b8">Cronograma · Diagnóstico · Metodología</text>
    <line x1="105" y1="154" x2="105" y2="168" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <!-- Fase 4 -->
    <rect x="5" y="172" width="200" height="24" rx="6" fill="#243d5c"/>
    <text x="105" y="188" text-anchor="middle" font-size="10" fill="white" font-weight="700">F4. Normalización base contable</text>
    <!-- Segunda columna -->
    <line x1="205" y1="82" x2="240" y2="82" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <rect x="244" y="64" width="200" height="36" rx="6" fill="#1D9E75"/>
    <text x="344" y="78" text-anchor="middle" font-size="10" fill="white" font-weight="700">F5. Conciliación contable</text>
    <text x="344" y="92" text-anchor="middle" font-size="8" fill="#d1fae5">Conciliados · Faltantes · Sobrantes</text>
    <line x1="344" y1="100" x2="344" y2="114" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <rect x="244" y="118" width="200" height="36" rx="6" fill="#1D9E75"/>
    <text x="344" y="132" text-anchor="middle" font-size="10" fill="white" font-weight="700">F6. Análisis faltantes/sobrantes</text>
    <text x="344" y="146" text-anchor="middle" font-size="8" fill="#d1fae5">Investigación · Documentación</text>
    <line x1="344" y1="154" x2="344" y2="168" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#a5)"/>
    <rect x="244" y="172" width="200" height="24" rx="6" fill="#BA7517"/>
    <text x="344" y="188" text-anchor="middle" font-size="10" fill="white" font-weight="700">F7. Informe final + Cierre</text>
    <!-- PDFs -->
    <line x1="444" y1="82" x2="484" y2="82" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a5)"/>
    <rect x="488" y="40" width="220" height="150" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="598" y="62" text-anchor="middle" font-size="10" fill="#1a2e4a" font-weight="700">📄 PDFs descargables</text>
    <text x="598" y="82" text-anchor="middle" font-size="9" fill="#64748b">• Informe de avance (Gantt SVG)</text>
    <text x="598" y="97" text-anchor="middle" font-size="9" fill="#64748b">• Control de horas (barras)</text>
    <text x="598" y="112" text-anchor="middle" font-size="9" fill="#64748b">• Cronograma de cobros (donut)</text>
    <text x="598" y="127" text-anchor="middle" font-size="9" fill="#64748b">• Evidencia de entregables</text>
    <text x="598" y="142" text-anchor="middle" font-size="9" fill="#64748b">• Documentos del repositorio</text>
    <text x="598" y="157" text-anchor="middle" font-size="9" fill="#64748b">• Informe ejecutivo completo</text>
    <text x="598" y="175" text-anchor="middle" font-size="8" fill="#94a3b8">todos con logo Aquarius</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Tab</th><th>Contenido</th><th>Acciones PDF disponibles</th></tr></thead>
  <tbody>
    <tr><td><strong>Gantt</strong></td><td>Cronograma de 9 fases con barra de progreso SVG, estado y avance por fase</td><td>PDF Informe de avance completo</td></tr>
    <tr><td><strong>Entregables</strong></td><td>Lista por fase: estado (pendiente/en curso/entregado), fecha límite, archivo subido</td><td>PDF Evidencia por entregable</td></tr>
    <tr><td><strong>Horas</strong></td><td>Cotizadas vs reales por cargo, variación y % de ejecución con semáforo</td><td>PDF Control de horas (barras)</td></tr>
    <tr><td><strong>Cobros</strong></td><td>Cronograma de cuotas: monto, fecha, estado (cobrado/pendiente/vencido)</td><td>PDF Cobros (donut cobranza)</td></tr>
    <tr><td><strong>Documentos</strong></td><td>Repositorio de archivos del proyecto con tipo, fecha y tamaño</td><td>PDF por documento individual</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S7 ==== -->
<h1 class="section-title" id="s7">7. Facturación y Cobros</h1>
<div class="section-line"></div>

<h2 class="sub-title">Estados de una factura</h2>

<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:14px;font-size:14px">Ciclo de vida de una factura</div>
  <svg viewBox="0 0 620 70" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:620px">
    <defs><marker id="a6" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="15" width="100" height="36" rx="6" fill="#94a3b8"/>
    <text x="55" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="700">Pendiente</text>
    <text x="55" y="47" text-anchor="middle" font-size="8" fill="#f8fafc">emitida, no cobrada</text>
    <line x1="105" y1="33" x2="135" y2="33" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a6)"/>
    <rect x="139" y="15" width="100" height="36" rx="6" fill="#BA7517"/>
    <text x="189" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="700">Por vencer</text>
    <text x="189" y="47" text-anchor="middle" font-size="8" fill="#fef3c7">vence en 7 días</text>
    <line x1="239" y1="33" x2="269" y2="33" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a6)"/>
    <rect x="273" y="15" width="100" height="36" rx="6" fill="#E24B4A"/>
    <text x="323" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="700">Vencida</text>
    <text x="323" y="47" text-anchor="middle" font-size="8" fill="#fee2e2">fecha límite pasada</text>
    <line x1="373" y1="33" x2="403" y2="33" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a6)"/>
    <rect x="407" y="15" width="100" height="36" rx="6" fill="#1D9E75"/>
    <text x="457" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="700">Cobrada ✓</text>
    <text x="457" y="47" text-anchor="middle" font-size="8" fill="#d1fae5">pago recibido</text>
    <line x1="507" y1="33" x2="537" y2="33" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a6)"/>
    <rect x="541" y="15" width="74" height="36" rx="6" fill="#1a2e4a"/>
    <text x="578" y="33" text-anchor="middle" font-size="10" fill="white" font-weight="700">Cierre</text>
    <text x="578" y="47" text-anchor="middle" font-size="8" fill="#94a3b8">proyecto cerrado</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Tab</th><th>Contenido</th></tr></thead>
  <tbody>
    <tr><td><strong>Todas las facturas</strong></td><td>Lista completa con filtros por cliente y estado. Clic para ver detalle. Botón PDF por factura.</td></tr>
    <tr><td><strong>Por cliente</strong></td><td>Agrupado por cliente: total emitido, cobrado y pendiente con donut de cobranza.</td></tr>
    <tr><td><strong>Flujo de caja</strong></td><td>Proyección mensual de ingresos esperados vs cobros recibidos.</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S8 ==== -->
<h1 class="section-title" id="s8">8. Propuestas Comerciales</h1>
<div class="section-line"></div>

<h2 class="sub-title">Flujo de vida de una propuesta</h2>

<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:14px;font-size:14px">Estados de una propuesta comercial</div>
  <svg viewBox="0 0 660 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:660px">
    <defs><marker id="a7" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="20" width="100" height="36" rx="6" fill="#64748b"/>
    <text x="55" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">Borrador</text>
    <text x="55" y="52" text-anchor="middle" font-size="8" fill="#f1f5f9">en elaboración</text>
    <line x1="105" y1="38" x2="135" y2="38" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a7)"/>
    <rect x="139" y="20" width="100" height="36" rx="6" fill="#4a9fd4"/>
    <text x="189" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">Enviada</text>
    <text x="189" y="52" text-anchor="middle" font-size="8" fill="#e0f2fe">al cliente</text>
    <line x1="239" y1="38" x2="269" y2="38" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a7)"/>
    <rect x="273" y="20" width="100" height="36" rx="6" fill="#BA7517"/>
    <text x="323" y="38" text-anchor="middle" font-size="10" fill="white" font-weight="700">Negociación</text>
    <text x="323" y="52" text-anchor="middle" font-size="8" fill="#fef3c7">ajuste términos</text>
    <line x1="373" y1="30" x2="403" y2="20" stroke="#1D9E75" stroke-width="1.5" marker-end="url(#a7)"/>
    <line x1="373" y1="46" x2="403" y2="56" stroke="#E24B4A" stroke-width="1.5" marker-end="url(#a7)"/>
    <rect x="407" y="5" width="100" height="30" rx="6" fill="#1D9E75"/>
    <text x="457" y="19" text-anchor="middle" font-size="10" fill="white" font-weight="700">Aprobada ✓</text>
    <text x="457" y="31" text-anchor="middle" font-size="8" fill="#d1fae5">→ crear proyecto</text>
    <rect x="407" y="42" width="100" height="30" rx="6" fill="#E24B4A"/>
    <text x="457" y="56" text-anchor="middle" font-size="10" fill="white" font-weight="700">Rechazada</text>
    <text x="457" y="68" text-anchor="middle" font-size="8" fill="#fee2e2">→ retroalimentación</text>
    <line x1="507" y1="20" x2="547" y2="38" stroke="#1D9E75" stroke-width="1.5" marker-end="url(#a7)"/>
    <rect x="551" y="22" width="100" height="36" rx="6" fill="#1a2e4a"/>
    <text x="601" y="38" text-anchor="middle" font-size="9" fill="white" font-weight="700">📄 Memorándum</text>
    <text x="601" y="52" text-anchor="middle" font-size="8" fill="#94a3b8">AF / Existencias</text>
  </svg>
</div>

<div class="alert alert-info">
  <span class="alert-icon">📄</span>
  <div><strong>Memorándum de inicio:</strong> Al aprobar una propuesta, genera el Memorándum de Inicio en formato PDF profesional con logo Aquarius, Gantt SVG de fases, tabla de personal, recursos asignados y matriz de comunicación. Disponible en tipo <strong>AF (Activo Fijo)</strong> y <strong>Existencias (Almacén)</strong>.</div>
</div>

<hr class="divider"/>

<!-- ==== S9 ==== -->
<h1 class="section-title" id="s9">9. Gestión de Recursos (módulo unificado)</h1>
<div class="section-line"></div>

<div class="card card-blue">
  <p><strong>Novedad v3.0:</strong> Los módulos "Requerimientos" y "Recursos" se fusionaron en <strong>Gestión de Recursos</strong> con 2 tabs. Acceso desde el menú: Operaciones → Recursos.</p>
</div>

<!-- Flujograma del módulo unificado -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:14px;font-size:15px">Módulo Gestión de Recursos — Estructura unificada</div>
  <svg viewBox="0 0 680 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:680px">
    <defs><marker id="a8" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="45" width="130" height="40" rx="8" fill="#1a2e4a"/>
    <text x="70" y="61" text-anchor="middle" font-size="11" fill="white" font-weight="700">🏗️ Gestión de</text>
    <text x="70" y="75" text-anchor="middle" font-size="11" fill="white" font-weight="700">Recursos</text>
    <line x1="135" y1="55" x2="175" y2="30" stroke="#4a9fd4" stroke-width="2" marker-end="url(#a8)"/>
    <line x1="135" y1="75" x2="175" y2="100" stroke="#4a9fd4" stroke-width="2" marker-end="url(#a8)"/>
    <!-- Tab 1 -->
    <rect x="179" y="10" width="210" height="50" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="284" y="28" text-anchor="middle" font-size="11" fill="#1a2e4a" font-weight="700">Tab 1: Recursos en campo</text>
    <text x="284" y="44" text-anchor="middle" font-size="9" fill="#64748b">Solicitudes · EPP · Equipos</text>
    <text x="284" y="56" text-anchor="middle" font-size="9" fill="#64748b">Disponibilidad · Matriz de carga</text>
    <!-- Tab 2 -->
    <rect x="179" y="80" width="210" height="50" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="284" y="98" text-anchor="middle" font-size="11" fill="#1a2e4a" font-weight="700">Tab 2: Requerimientos</text>
    <text x="284" y="114" text-anchor="middle" font-size="9" fill="#64748b">Personal · TI · EPP · Viáticos</text>
    <text x="284" y="126" text-anchor="middle" font-size="9" fill="#64748b">5 formularios por proyecto</text>
    <!-- Outputs -->
    <line x1="389" y1="35" x2="419" y2="50" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a8)"/>
    <line x1="389" y1="105" x2="419" y2="90" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a8)"/>
    <rect x="423" y="45" width="245" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
    <text x="545" y="59" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">📄 PDFs con gráficas:</text>
    <text x="545" y="73" text-anchor="middle" font-size="9" fill="#64748b">Solicitud de recursos · Requerimiento integral</text>
    <text x="545" y="85" text-anchor="middle" font-size="8" fill="#94a3b8">con tablas de personal, EPP, viáticos y equipos</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Tab</th><th>Sub-tabs</th><th>Acciones principales</th></tr></thead>
  <tbody>
    <tr><td><strong>Recursos en campo</strong></td><td>Solicitudes · Disponibilidad · Matriz de carga</td><td>Crear solicitud (3 pasos), aprobar/rechazar, actualizar EPP/equipos, descargar PDF</td></tr>
    <tr><td><strong>Requerimientos</strong></td><td>Lista · Nuevo requerimiento (5 pasos)</td><td>Personal, TI/equipos, EPP, viáticos. PDF integral con todas las secciones.</td></tr>
  </tbody>
</table>

<h2 class="sub-title">Crear solicitud de recursos — 3 pasos</h2>
<div class="steps">
  <div class="step"><div class="step-num">1</div><div class="step-content"><div class="step-title">Datos del proyecto</div><div class="step-desc">Seleccionar proyecto, ingresar fechas de inicio y fin estimadas, agregar notas especiales (ubicación, condiciones de campo).</div></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-content"><div class="step-title">Personal requerido</div><div class="step-desc">Seleccionar cargo e ingresar horas asignadas. El sistema sugiere consultores disponibles con ese perfil del CONSULTORES_POOL.</div></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-content"><div class="step-title">Documentos y EPP</div><div class="step-desc">Marcar documentos requeridos (SCTR, Vacunas, Examen médico), ingresar EPP y equipos. Revisar resumen y guardar.</div></div></div>
</div>

<hr class="divider"/>

<!-- ==== S10 ==== -->
<h1 class="section-title" id="s10">10. RRHH — Gestión de Personal</h1>
<div class="section-line"></div>

<table class="manual-table">
  <thead><tr><th>Tab</th><th>Contenido</th></tr></thead>
  <tbody>
    <tr><td><strong>Directorio</strong></td><td>Ficha de cada consultor: cargo, tarifa USD/h, certificaciones (NIIF 13, NIIF 16, SITIA), proyectos actuales, EPP asignado, historial de evaluaciones</td></tr>
    <tr><td><strong>Carga y disponibilidad</strong></td><td>Horas usadas vs disponibles por mes, carga %, estado: Disponible / En proyecto / Sobrecargado</td></tr>
    <tr><td><strong>Evaluaciones</strong></td><td>Tarjetas por consultor con nota promedio 1-5 y evaluaciones por proyecto. Registrar nuevas evaluaciones con comentario.</td></tr>
  </tbody>
</table>

<!-- Gráfico de carga -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:12px;font-size:14px">Semáforo de carga de consultores</div>
  <svg viewBox="0 0 560 70" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:560px">
    <rect x="5" y="15" width="155" height="40" rx="8" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"/>
    <text x="82" y="31" text-anchor="middle" font-size="11" fill="#134e3c" font-weight="700">🟢 Disponible</text>
    <text x="82" y="48" text-anchor="middle" font-size="9" fill="#134e3c">Carga &lt; 70%</text>
    <rect x="175" y="15" width="155" height="40" rx="8" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"/>
    <text x="252" y="31" text-anchor="middle" font-size="11" fill="#92400e" font-weight="700">🟡 En proyecto</text>
    <text x="252" y="48" text-anchor="middle" font-size="9" fill="#92400e">Carga 70% - 95%</text>
    <rect x="345" y="15" width="155" height="40" rx="8" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"/>
    <text x="422" y="31" text-anchor="middle" font-size="11" fill="#991b1b" font-weight="700">🔴 Sobrecargado</text>
    <text x="422" y="48" text-anchor="middle" font-size="9" fill="#991b1b">Carga &gt; 95%</text>
  </svg>
</div>

<hr class="divider"/>

<!-- ==== S11 ==== -->
<h1 class="section-title" id="s11">11. Control de Calidad</h1>
<div class="section-line"></div>

<div class="card card-teal">
  <p>Módulo especializado para el equipo de campo. Gestiona checklists de inventario físico, activos faltantes/sobrantes y escalado de excepciones. PDF con donut de conformidad + barras por estado.</p>
</div>

<table class="manual-table">
  <thead><tr><th>Estado del activo</th><th>Descripción</th><th>Acción recomendada</th></tr></thead>
  <tbody>
    <tr><td><span class="pill pill-teal">✅ Conforme</span></td><td>Activo encontrado en la ubicación asignada, en buen estado</td><td>Registrar y continuar</td></tr>
    <tr><td><span class="pill pill-red">❌ Faltante</span></td><td>Activo no localizado en la zona asignada</td><td>Escalar al Jefe de Proyecto, documentar observación</td></tr>
    <tr><td><span class="pill pill-blue">➕ Sobrante</span></td><td>Activo encontrado pero no figura en la base contable</td><td>Registrar como sobrante, incluir en conciliación</td></tr>
    <tr><td><span class="pill pill-amber">⚠️ Deteriorado</span></td><td>Activo presente pero con daño visible</td><td>Fotografiar, documentar condición, coordinar con cliente</td></tr>
  </tbody>
</table>

<!-- Gráfico de conformidad -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:12px;font-size:14px">Indicadores de calidad del inventario</div>
  <svg viewBox="0 0 600 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:600px">
    <rect x="5" y="10" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="70" y="35" text-anchor="middle" font-size="22" fill="#1D9E75" font-weight="900">75%+</text>
    <text x="70" y="52" text-anchor="middle" font-size="10" fill="#134e3c" font-weight="600">🟢 Excelente</text>
    <text x="70" y="65" text-anchor="middle" font-size="9" fill="#64748b">conformidad alta</text>
    <rect x="155" y="10" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="220" y="35" text-anchor="middle" font-size="22" fill="#BA7517" font-weight="900">50-74%</text>
    <text x="220" y="52" text-anchor="middle" font-size="10" fill="#92400e" font-weight="600">🟡 Aceptable</text>
    <text x="220" y="65" text-anchor="middle" font-size="9" fill="#64748b">revisar faltantes</text>
    <rect x="305" y="10" width="130" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="370" y="35" text-anchor="middle" font-size="22" fill="#E24B4A" font-weight="900">&lt;50%</text>
    <text x="370" y="52" text-anchor="middle" font-size="10" fill="#991b1b" font-weight="600">🔴 Crítico</text>
    <text x="370" y="65" text-anchor="middle" font-size="9" fill="#64748b">escalar urgente</text>
    <rect x="455" y="10" width="140" height="60" rx="8" fill="#1a2e4a"/>
    <text x="525" y="30" text-anchor="middle" font-size="9" fill="white">PDF de control incluye:</text>
    <text x="525" y="44" text-anchor="middle" font-size="9" fill="#94a3b8">• Donut de conformidad</text>
    <text x="525" y="57" text-anchor="middle" font-size="9" fill="#94a3b8">• Barras por estado</text>
    <text x="525" y="68" text-anchor="middle" font-size="9" fill="#94a3b8">• Tabla de activos</text>
  </svg>
</div>

<hr class="divider"/>

<!-- ==== S12 ==== -->
<h1 class="section-title" id="s12">12. Reportería Avanzada</h1>
<div class="section-line"></div>

<div class="card card-blue">
  <p>3 tabs: <strong>Tablero ejecutivo</strong> (gráficas en tiempo real), <strong>Catálogo de reportes</strong> (12 reportes descargables) y <strong>Por proyecto</strong> (ficha individual). <strong>Novedad v3.0:</strong> Selector Mensual/Trimestral/Anual — cambia el período en Dashboard y Reportes simultáneamente. El botón "Informe Ejecutivo" muestra el período seleccionado en su etiqueta.</p>
</div>

<h2 class="sub-title">Selector de período — cómo funciona</h2>

<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:12px;font-size:14px">Flujo del selector Mensual / Trimestral / Anual</div>
  <svg viewBox="0 0 660 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:660px">
    <defs><marker id="a9" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#4a9fd4"/></marker></defs>
    <!-- Selector -->
    <rect x="5" y="45" width="120" height="40" rx="8" fill="#1a2e4a"/>
    <text x="65" y="61" text-anchor="middle" font-size="10" fill="white" font-weight="700">🔽 Selector</text>
    <text x="65" y="77" text-anchor="middle" font-size="9" fill="#94a3b8">Mensual/Trim./Anual</text>
    <!-- Flechas al centro -->
    <line x1="125" y1="55" x2="165" y2="22" stroke="#4a9fd4" stroke-width="2" marker-end="url(#a9)"/>
    <line x1="125" y1="65" x2="165" y2="65" stroke="#4a9fd4" stroke-width="2" marker-end="url(#a9)"/>
    <line x1="125" y1="75" x2="165" y2="107" stroke="#4a9fd4" stroke-width="2" marker-end="url(#a9)"/>
    <!-- 3 destinos separados -->
    <rect x="169" y="5" width="130" height="34" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="234" y="20" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">📊 Dashboard</text>
    <text x="234" y="34" text-anchor="middle" font-size="8" fill="#64748b">gráfica 1 / 3 / 6 meses</text>
    <rect x="169" y="48" width="130" height="34" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="234" y="63" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">📑 Reportes</text>
    <text x="234" y="77" text-anchor="middle" font-size="8" fill="#64748b">subtítulo dinámico</text>
    <rect x="169" y="91" width="130" height="34" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="234" y="106" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="600">📄 PDF ejecutivo</text>
    <text x="234" y="120" text-anchor="middle" font-size="8" fill="#64748b">título con período real</text>
    <!-- Flechas al resultado -->
    <line x1="299" y1="22" x2="339" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a9)"/>
    <line x1="299" y1="65" x2="339" y2="65" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a9)"/>
    <line x1="299" y1="108" x2="339" y2="75" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a9)"/>
    <!-- Resultado -->
    <rect x="343" y="35" width="310" height="60" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="498" y="55" text-anchor="middle" font-size="10" fill="#1a2e4a" font-weight="700">Mensual → Mar 2026</text>
    <text x="498" y="72" text-anchor="middle" font-size="10" fill="#1a2e4a" font-weight="700">Trimestral → Q1 2026 (Ene–Mar)</text>
    <text x="498" y="88" text-anchor="middle" font-size="9" fill="#64748b">Anual → Oct 2025 – Mar 2026 (6 meses)</text>
  </svg>
</div>

<h2 class="sub-title">Catálogo de reportes disponibles</h2>
<table class="manual-table">
  <thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Formato</th></tr></thead>
  <tbody>
    <tr><td>R01</td><td>Pipeline CRM</td><td><span class="pill pill-blue">Comercial</span></td><td>PDF / Excel</td></tr>
    <tr><td>R02</td><td>Ranking de Ejecutivos</td><td><span class="pill pill-blue">Comercial</span></td><td>PDF / Excel</td></tr>
    <tr><td>R03</td><td>Cotizaciones Emitidas</td><td><span class="pill pill-teal">Financiero</span></td><td>Excel</td></tr>
    <tr><td>R04</td><td>Flujo de Cobros</td><td><span class="pill pill-teal">Financiero</span></td><td>PDF / Excel</td></tr>
    <tr><td>R05</td><td>Avance de Proyectos</td><td><span class="pill pill-amber">Ejecución</span></td><td>PDF</td></tr>
    <tr><td>R06</td><td>Control de Entregables</td><td><span class="pill pill-amber">Ejecución</span></td><td>Excel</td></tr>
    <tr><td>R07</td><td>Real vs. Cotizado</td><td><span class="pill pill-navy">Presupuestal</span></td><td>Excel / PDF</td></tr>
    <tr><td>R08</td><td>Informe Ejecutivo (período dinámico)</td><td><span class="pill pill-red">Gerencial</span></td><td>PDF</td></tr>
    <tr><td>R09</td><td>Carga de Consultores</td><td><span class="pill pill-navy">RRHH</span></td><td>Excel / PDF</td></tr>
    <tr><td>R10</td><td>Rentabilidad por Proyecto</td><td><span class="pill pill-red">Gerencial</span></td><td>PDF / Excel</td></tr>
    <tr><td>R11</td><td>Propuestas Enviadas</td><td><span class="pill pill-blue">Comercial</span></td><td>PDF / Excel</td></tr>
    <tr><td>R12</td><td>Estado de Facturación</td><td><span class="pill pill-teal">Financiero</span></td><td>PDF / Excel</td></tr>
  </tbody>
</table>

<div class="alert alert-info">
  <span class="alert-icon">💡</span>
  <div><strong>¿Cómo descargar un reporte?</strong> Tab "Catálogo de reportes" → clic en el reporte → botón <span class="pill pill-blue">⬇ PDF</span> o <span class="pill pill-blue">⬇ Excel</span>. El PDF se abre en nueva pestaña — usa <strong>Ctrl+P → Guardar como PDF</strong>. Los PDFs incluyen logo Aquarius, KPIs, gráficas SVG (donuts y barras) y análisis IA.</div>
</div>

<hr class="divider"/>

<!-- ==== S13 ==== -->
<h1 class="section-title" id="s13">13. Notificaciones e Integraciones</h1>
<div class="section-line"></div>

<div class="card card-navy">
  <p><strong>Novedad v3.0:</strong> Las notificaciones ya <strong>no son un módulo del menú</strong>. Se accede haciendo clic en el <strong>ícono 🔔 en el Header</strong>. El badge rojo muestra el número de notificaciones sin leer. El módulo <code>PanelNotificaciones</code> sigue accesible desde el menú solo como vista completa.</p>
</div>

<!-- Flujograma notificaciones -->
<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:14px;font-size:15px">Panel flotante de notificaciones</div>
  <svg viewBox="0 0 620 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:620px">
    <defs><marker id="a10" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="30" width="110" height="40" rx="8" fill="#1a2e4a"/>
    <text x="60" y="46" text-anchor="middle" font-size="10" fill="white" font-weight="700">🔔 Clic en</text>
    <text x="60" y="60" text-anchor="middle" font-size="10" fill="white" font-weight="700">campana</text>
    <line x1="115" y1="50" x2="145" y2="50" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a10)"/>
    <rect x="149" y="10" width="180" height="80" rx="8" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="239" y="30" text-anchor="middle" font-size="10" fill="#1a2e4a" font-weight="700">📋 Panel flotante</text>
    <text x="239" y="46" text-anchor="middle" font-size="9" fill="#64748b">Lista scrollable de notificaciones</text>
    <text x="239" y="60" text-anchor="middle" font-size="9" fill="#64748b">Punto de color por tipo (🔴🟡🔵🟢)</text>
    <text x="239" y="74" text-anchor="middle" font-size="9" fill="#64748b">Marcar leída · Marcar todas</text>
    <text x="239" y="86" text-anchor="middle" font-size="9" fill="#64748b">→ navega al módulo origen</text>
    <line x1="329" y1="30" x2="369" y2="20" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a10)"/>
    <line x1="329" y1="70" x2="369" y2="80" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a10)"/>
    <rect x="373" y="5" width="230" height="30" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"/>
    <text x="488" y="25" text-anchor="middle" font-size="9" fill="#991b1b" font-weight="600">🔴 Crítico — Acción inmediata requerida</text>
    <rect x="373" y="65" width="230" height="30" rx="6" fill="rgba(74,159,212,.1)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="488" y="85" text-anchor="middle" font-size="9" fill="#1e3a5f" font-weight="600">🔵 Info — Ver detalles en módulo</text>
  </svg>
</div>

<h2 class="sub-title">Niveles de alerta</h2>
<table class="manual-table">
  <thead><tr><th>Nivel</th><th>Color</th><th>Ejemplos</th></tr></thead>
  <tbody>
    <tr><td><strong>🔴 Crítico</strong></td><td><span style="color:var(--red)">Rojo #E24B4A</span></td><td>Margen &lt;10%, entregable atrasado &gt;5 días, factura vencida, horas &gt;95%</td></tr>
    <tr><td><strong>🟡 Alerta</strong></td><td><span style="color:var(--amber)">Ámbar #BA7517</span></td><td>Lead sin actividad &gt;7 días, margen 12-18%, horas 80-95%</td></tr>
    <tr><td><strong>🔵 Info</strong></td><td><span style="color:var(--blue)">Azul #4a9fd4</span></td><td>Recursos confirmados, entregable subido, cotización guardada</td></tr>
    <tr><td><strong>🟢 Éxito</strong></td><td><span style="color:var(--teal)">Teal #1D9E75</span></td><td>Proyecto cerrado &gt;22% margen, fase completada en fecha, cobro recibido</td></tr>
  </tbody>
</table>

<h2 class="sub-title">Integraciones disponibles</h2>
<table class="manual-table">
  <thead><tr><th>Integración</th><th>Estado</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td>📊 Excel / SpreadsheetML</td><td><span class="pill pill-teal">Activo</span></td><td>Exportación nativa sin dependencias. Cabecera navy, filas alternas.</td></tr>
    <tr><td>🏛️ SUNAT API</td><td><span class="pill pill-blue">Beta</span></td><td>Consulta automática de RUC al crear leads</td></tr>
    <tr><td>📱 WhatsApp Business</td><td><span class="pill pill-amber">Próximamente</span></td><td>Recordatorios de cobro y alertas a clientes</td></tr>
    <tr><td>📅 Google Calendar</td><td><span class="pill pill-amber">Próximamente</span></td><td>Sincronización de hitos y reuniones del proyecto</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S14 ==== -->
<h1 class="section-title" id="s14">14. Asistente IA y Análisis</h1>
<div class="section-line"></div>

<div class="card card-navy">
  <p>El <strong>Chat IA</strong> (esquina inferior derecha, ícono 🤖) está disponible en toda la aplicación. Utiliza <strong>Claude API (claude-sonnet-4-20250514)</strong>. Conoce tu rol, proyectos activos y leads del pipeline para respuestas contextualizadas.</p>
</div>

<div class="alert alert-exito">
  <span class="alert-icon">✅</span>
  <div><strong>Ejemplos de preguntas que puedes hacer:</strong><br/>
  • "¿Cómo creo una cotización para un proyecto minero?" → Explica los pasos exactos<br/>
  • "¿Cuál es el avance actual de SIMSA?" → Consulta los datos del proyecto<br/>
  • "¿Qué módulos tengo disponibles?" → Lista módulos por tu rol<br/>
  • "Analiza la rentabilidad de mis proyectos actuales" → Análisis con IA<br/>
  • "¿Cómo registro un cobro en Facturación?" → Guía paso a paso</div>
</div>

<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:12px;font-size:14px">Flujo del Asistente IA</div>
  <svg viewBox="0 0 580 70" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:580px">
    <defs><marker id="a11" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="15" width="100" height="40" rx="6" fill="#1a2e4a"/>
    <text x="55" y="31" text-anchor="middle" font-size="9" fill="white" font-weight="700">👤 Pregunta</text>
    <text x="55" y="47" text-anchor="middle" font-size="8" fill="#94a3b8">del usuario</text>
    <line x1="105" y1="35" x2="135" y2="35" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a11)"/>
    <rect x="139" y="15" width="130" height="40" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="204" y="31" text-anchor="middle" font-size="9" fill="#1a2e4a" font-weight="700">📦 Contexto</text>
    <text x="204" y="47" text-anchor="middle" font-size="8" fill="#64748b">rol + proyectos + leads</text>
    <line x1="269" y1="35" x2="299" y2="35" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a11)"/>
    <rect x="303" y="10" width="130" height="50" rx="6" fill="#BA7517"/>
    <text x="368" y="30" text-anchor="middle" font-size="10" fill="white" font-weight="700">🤖 Claude API</text>
    <text x="368" y="44" text-anchor="middle" font-size="8" fill="#fef3c7">claude-sonnet-4</text>
    <text x="368" y="56" text-anchor="middle" font-size="8" fill="#fef3c7">20250514</text>
    <line x1="433" y1="35" x2="463" y2="35" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#a11)"/>
    <rect x="467" y="15" width="108" height="40" rx="6" fill="#1D9E75"/>
    <text x="521" y="31" text-anchor="middle" font-size="9" fill="white" font-weight="700">💬 Respuesta</text>
    <text x="521" y="47" text-anchor="middle" font-size="8" fill="#d1fae5">contextualizada</text>
  </svg>
</div>

<hr class="divider"/>

<!-- ==== S15 ==== -->
<h1 class="section-title" id="s15">15. Motor de Alertas</h1>
<div class="section-line"></div>

<div class="flowchart">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Flujo del Motor de Alertas Automático</div>
  <svg viewBox="0 0 700 160" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:700px">
    <defs><marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#94a3b8"/></marker></defs>
    <rect x="5" y="10" width="120" height="35" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="65" y="32" text-anchor="middle" font-size="10" fill="#1a2e4a">📊 Proyectos</text>
    <rect x="5" y="60" width="120" height="35" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="65" y="82" text-anchor="middle" font-size="10" fill="#1a2e4a">🎯 Leads CRM</text>
    <rect x="5" y="110" width="120" height="35" rx="6" fill="rgba(74,159,212,.05)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="65" y="132" text-anchor="middle" font-size="10" fill="#1a2e4a">🧾 Facturas</text>
    <line x1="125" y1="27" x2="185" y2="80" stroke="#94a3b8" stroke-width="1" marker-end="url(#arr)"/>
    <line x1="125" y1="77" x2="185" y2="80" stroke="#94a3b8" stroke-width="1" marker-end="url(#arr)"/>
    <line x1="125" y1="127" x2="185" y2="80" stroke="#94a3b8" stroke-width="1" marker-end="url(#arr)"/>
    <rect x="190" y="55" width="130" height="50" rx="8" fill="#1a2e4a"/>
    <text x="255" y="77" text-anchor="middle" font-size="11" fill="white" font-weight="700">⚡ Motor de</text>
    <text x="255" y="93" text-anchor="middle" font-size="11" fill="white" font-weight="700">Alertas</text>
    <line x1="320" y1="65" x2="370" y2="30" stroke="#E24B4A" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="320" y1="75" x2="370" y2="70" stroke="#BA7517" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="320" y1="85" x2="370" y2="110" stroke="#4a9fd4" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="320" y1="95" x2="370" y2="140" stroke="#1D9E75" stroke-width="1.5" marker-end="url(#arr)"/>
    <rect x="374" y="10" width="160" height="30" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"/>
    <text x="454" y="30" text-anchor="middle" font-size="10" fill="#991b1b" font-weight="600">🔴 Crítico — Acción inmediata</text>
    <rect x="374" y="55" width="160" height="30" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1.5"/>
    <text x="454" y="75" text-anchor="middle" font-size="10" fill="#92400e" font-weight="600">🟡 Alerta — Requiere atención</text>
    <rect x="374" y="100" width="160" height="30" rx="6" fill="rgba(74,159,212,.1)" stroke="#4a9fd4" stroke-width="1.5"/>
    <text x="454" y="120" text-anchor="middle" font-size="10" fill="#1e3a5f" font-weight="600">🔵 Info — Solo informativo</text>
    <rect x="374" y="130" width="160" height="30" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1.5"/>
    <text x="454" y="150" text-anchor="middle" font-size="10" fill="#134e3c" font-weight="600">🟢 Éxito — Todo en orden</text>
    <line x1="534" y1="25" x2="584" y2="55" stroke="#94a3b8" stroke-width="1" marker-end="url(#arr)"/>
    <line x1="534" y1="70" x2="584" y2="65" stroke="#94a3b8" stroke-width="1" marker-end="url(#arr)"/>
    <rect x="588" y="40" width="108" height="50" rx="6" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/>
    <text x="642" y="58" text-anchor="middle" font-size="9" fill="#475569" font-weight="600">🔔 Campana</text>
    <text x="642" y="72" text-anchor="middle" font-size="8" fill="#64748b">Header (badge)</text>
    <text x="642" y="85" text-anchor="middle" font-size="8" fill="#64748b">Dashboard</text>
  </svg>
</div>

<table class="manual-table">
  <thead><tr><th>Condición</th><th>Nivel</th><th>Dónde aparece</th></tr></thead>
  <tbody>
    <tr><td>Margen &lt; 10% en proyecto activo</td><td><span class="pill pill-red">Crítico 🔴</span></td><td>Campana + Dashboard + Ejecución</td></tr>
    <tr><td>Entregable atrasado &gt; 5 días</td><td><span class="pill pill-red">Crítico 🔴</span></td><td>Campana + Dashboard</td></tr>
    <tr><td>Horas al 95% del presupuesto</td><td><span class="pill pill-red">Crítico 🔴</span></td><td>Campana + Ejecución</td></tr>
    <tr><td>Lead sin actividad &gt; 7 días</td><td><span class="pill pill-amber">Alerta 🟡</span></td><td>Campana + CRM</td></tr>
    <tr><td>Margen entre 12% y 18%</td><td><span class="pill pill-amber">Alerta 🟡</span></td><td>Campana + Dashboard</td></tr>
    <tr><td>Recursos confirmados en campo</td><td><span class="pill pill-blue">Info 🔵</span></td><td>Campana</td></tr>
    <tr><td>Proyecto cerrado con margen &gt; 22%</td><td><span class="pill pill-teal">Éxito 🟢</span></td><td>Campana + Dashboard</td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- ==== S16 ==== -->
<h1 class="section-title" id="s16">16. Configuración y Administración</h1>
<div class="section-line"></div>

<div class="alert alert-alerta">
  <span class="alert-icon">⚠️</span>
  <div><strong>Solo Admin:</strong> El módulo de Configuración es exclusivo para el rol Administrador (Wilmer Moreno V.). Gestiona usuarios, tarifas, roles y parámetros del sistema.</div>
</div>

<table class="manual-table">
  <thead><tr><th>Tab</th><th>Función</th></tr></thead>
  <tbody>
    <tr><td><strong>Usuarios</strong></td><td>Ver, activar/desactivar y gestionar usuarios. Crear nuevos usuarios con rol asignado.</td></tr>
    <tr><td><strong>Roles y permisos</strong></td><td>Configurar módulos accesibles por rol. Crear nuevos roles personalizados.</td></tr>
    <tr><td><strong>Tarifas</strong></td><td>Gestionar tarifas USD/h por cargo. Se usan en la calculadora de cotizaciones. Tipo de cambio S/3.60.</td></tr>
    <tr><td><strong>Parámetros</strong></td><td>Margen objetivo ISO 9001, número de fases estándar, glosario de términos técnicos.</td></tr>
  </tbody>
</table>

<h2 class="sub-title">Usuarios del sistema</h2>
<table class="manual-table">
  <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Contraseña demo</th></tr></thead>
  <tbody>
    <tr><td>Wilmer Moreno V.</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="abdc85c7dec1cac5ebcadadecad9c2ded885dbce">[email&#160;protected]</a></td><td><span class="pill pill-red">Admin</span></td><td><code>aquarius2026</code></td></tr>
    <tr><td>Pedro Vargas</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="63134d1502110402102302121602110a16104d1306">[email&#160;protected]</a></td><td><span class="pill pill-teal">Comercial</span></td><td><code>pedro123</code></td></tr>
    <tr><td>Carlos Quispe</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="91f2bfe0e4f8e2e1f4d1f0e0e4f0e3f8e4e2bfe1f4">[email&#160;protected]</a></td><td><span class="pill pill-blue">Jefe Proyecto</span></td><td><code>carlos123</code></td></tr>
    <tr><td>María López</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="d5b8fbb9baa5b0af95b4a4a0b4a7bca0a6fba5b0">[email&#160;protected]</a></td><td><span class="pill pill-navy">Consultor</span></td><td><code>maria123</code></td></tr>
    <tr><td>Ana Torres</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="ddbcf3a9b2afafb8ae9dbcaca8bcafb4a8aef3adb8">[email&#160;protected]</a></td><td><span class="pill pill-navy">Consultor</span></td><td><code>ana123</code></td></tr>
    <tr><td>Gerencia</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="ea8d8f988f8489838baa8b9b9f8b98839f99c49a8f">[email&#160;protected]</a></td><td><span class="pill pill-amber">Gerencia</span></td><td><code>gerencia2026</code></td></tr>
    <tr><td>Recursos Humanos</td><td><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="0e7c7c66664e6f7f7b6f7c677b7d207e6b">[email&#160;protected]</a></td><td><span class="pill pill-navy">RRHH</span></td><td><code>rrhh123</code></td></tr>
  </tbody>
</table>

<hr class="divider"/>

<!-- RESUMEN EJECUTIVO -->
<h1 class="section-title">Resumen ejecutivo — Nexova CRM Pro v3.0</h1>
<div class="section-line"></div>

<div class="card card-navy" style="text-align:center;padding:32px">
  <div style="font-size:32px;font-weight:900;color:var(--navy);margin-bottom:8px">Nexova CRM Pro v3.0</div>
  <div style="font-size:14px;color:var(--t3);margin-bottom:24px">Software Empresarial · Nexova · nexova.pe · ${new Date().toLocaleDateString("es-PE",{month:"long",year:"numeric"})}</div>
  <div class="kpi-row">
    <div class="kpi-box"><div class="kpi-val">16</div><div class="kpi-lbl">Módulos activos</div></div>
    <div class="kpi-box"><div class="kpi-val" style="color:var(--teal)">7</div><div class="kpi-lbl">Roles de usuario</div></div>
    <div class="kpi-box"><div class="kpi-val" style="color:var(--amber)">12</div><div class="kpi-lbl">Reportes PDF+Excel</div></div>
    <div class="kpi-box"><div class="kpi-val" style="color:var(--red)">16</div><div class="kpi-lbl">PDFs con gráficas SVG</div></div>
  </div>
</div>

<!-- Flujograma ciclo completo -->
<div class="flowchart" style="margin-top:24px">
  <div style="font-weight:700;color:var(--navy);margin-bottom:16px;font-size:15px">Ciclo completo — Lead a cobro</div>
  <svg viewBox="0 0 720 90" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:720px">
    <defs><marker id="ac" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#4a9fd4"/></marker></defs>
    <rect x="5" y="25" width="90" height="40" rx="6" fill="#94a3b8"/>
    <text x="50" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">🎯 Lead</text>
    <text x="50" y="57" text-anchor="middle" font-size="8" fill="#f8fafc">CRM Pipeline</text>
    <line x1="95" y1="45" x2="115" y2="45" stroke="#4a9fd4" stroke-width="2" marker-end="url(#ac)"/>
    <rect x="119" y="25" width="90" height="40" rx="6" fill="#4a9fd4"/>
    <text x="164" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">💰 Cotización</text>
    <text x="164" y="57" text-anchor="middle" font-size="8" fill="#e0f2fe">Margen ≥30%</text>
    <line x1="209" y1="45" x2="229" y2="45" stroke="#4a9fd4" stroke-width="2" marker-end="url(#ac)"/>
    <rect x="233" y="25" width="90" height="40" rx="6" fill="#BA7517"/>
    <text x="278" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">📋 Propuesta</text>
    <text x="278" y="57" text-anchor="middle" font-size="8" fill="#fef3c7">+ Memorándum</text>
    <line x1="323" y1="45" x2="343" y2="45" stroke="#4a9fd4" stroke-width="2" marker-end="url(#ac)"/>
    <rect x="347" y="25" width="90" height="40" rx="6" fill="#1a2e4a"/>
    <text x="392" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">🚀 Ejecución</text>
    <text x="392" y="57" text-anchor="middle" font-size="8" fill="#94a3b8">9 fases · Gantt</text>
    <line x1="437" y1="45" x2="457" y2="45" stroke="#4a9fd4" stroke-width="2" marker-end="url(#ac)"/>
    <rect x="461" y="25" width="90" height="40" rx="6" fill="#7c3aed"/>
    <text x="506" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">📈 Control</text>
    <text x="506" y="57" text-anchor="middle" font-size="8" fill="#e9d5ff">Presupuesto</text>
    <line x1="551" y1="45" x2="571" y2="45" stroke="#4a9fd4" stroke-width="2" marker-end="url(#ac)"/>
    <rect x="575" y="25" width="90" height="40" rx="6" fill="#1D9E75"/>
    <text x="620" y="41" text-anchor="middle" font-size="9" fill="white" font-weight="700">💳 Cobros</text>
    <text x="620" y="57" text-anchor="middle" font-size="8" fill="#d1fae5">Facturación</text>
  </svg>
  `;
    const blob = new Blob([html], {type:"text/html;charset=utf-8"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "Manual_Aquarius_CRM_Pro_v3.html";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const secciones = [
    {ico:"🔐",tit:"Acceso y roles",           desc:"Login, usuarios, permisos por rol (Admin, Comercial, Gerencia, Jefe Proyecto, Consultor, Operaciones, RRHH)."},
    {ico:"📊",tit:"Dashboard Gerencial",       desc:"KPIs, widgets drag & drop, gráficas Recharts, selector Mensual/Trimestral/Anual, PDF ejecutivo."},
    {ico:"🎯",tit:"CRM — Pipeline Comercial",  desc:"Leads Kanban, tabla, galería de servicios, actividades, follow-up automatizado, navegación a cotizaciones."},
    {ico:"💰",tit:"Cotizaciones",              desc:"Calculadora con 19 tarifas, personal, EPP, gastos, margen automático, análisis IA, PDF con gráficas."},
    {ico:"📋",tit:"Propuestas Comerciales",    desc:"Pipeline de propuestas, estados, memorándum de inicio AF/Existencias con Gantt + Organigrama SVG."},
    {ico:"🚀",tit:"Módulo Ejecución",          desc:"Gantt 9 fases, entregables, control de horas, cronograma de cobros, documentos, PDF completo."},
    {ico:"🏗️",tit:"Gestión de Recursos",      desc:"2 tabs: Recursos en campo (solicitudes, EPP, equipos) y Requerimientos de proyecto (5 formularios)."},
    {ico:"✅",tit:"Control de Calidad",        desc:"Inventario físico, activos conformes/faltantes/sobrantes/deteriorados, reporte PDF con donut."},
    {ico:"📈",tit:"Control Presupuestal",      desc:"Real vs cotizado por rubros, variaciones, alertas de sobrecosto, gráficas por proyecto."},
    {ico:"🧾",tit:"Facturación y Cobros",      desc:"Facturas emitidas, estados, flujo de caja, cobranza por cliente, PDF con donut de cobranza."},
    {ico:"📑",tit:"Reportería Avanzada",       desc:"12 reportes R01–R12, selector de período Mensual/Trimestral/Anual, PDF + Excel con gráficas."},
    {ico:"👥",tit:"RRHH",                      desc:"Directorio de consultores, carga horaria, disponibilidad, evaluaciones y certificaciones."},
    {ico:"🤖",tit:"Asistente IA",              desc:"Chat con Claude API: análisis de rentabilidad, consultas de proyectos y guías paso a paso."},
    {ico:"🔔",tit:"Notificaciones",            desc:"Panel flotante en el Header con alertas críticas, de advertencia, informativas y de éxito."},
    {ico:"📊",tit:"Integraciones",             desc:"Excel SpreadsheetML nativo, SUNAT API (beta), WhatsApp Business y Google Calendar (próximamente)."},
    {ico:"⚙️",tit:"Configuración",            desc:"Solo Admin: usuarios, roles, tarifas por cargo, parámetros del sistema y margen objetivo."},
  ];
  return (
    <div>
      <div className="sh" style={{marginBottom:16}}>
        <div><div className="st">Manual de Usuario</div><div className="ss">Nexova CRM Pro v3.0 · {secciones.length} módulos documentados · {new Date().toLocaleDateString("es-PE",{month:"long",year:"numeric"})}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span className="pill teal">v3.0</span>
          <button className="btn btn-p btn-sm" onClick={descargarManual}>⬇ Descargar Manual HTML</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {secciones.map((s,i)=>(
          <div key={i} className="card" style={{padding:16}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.ico}</div>
            <div style={{fontSize:13,fontWeight:700,color:"var(--navy)",marginBottom:4}}>{s.tit}</div>
            <div style={{fontSize:12,color:"var(--t3)",lineHeight:1.5}}>{s.desc}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{marginTop:16,padding:20,background:"#1D9E75",color:"#fff",borderRadius:10,marginBottom:80}}>
        <div style={{fontSize:12,opacity:.7,marginBottom:8}}>Credenciales de acceso demo</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8,fontSize:12}}>
          {[
            ["wilmer@nexova.pe","aquarius2026","Admin"],
            ["p.vargas@aquarius.pe","pedro123","Comercial"],
            ["c.quispe@aquarius.pe","carlos123","Jefe Proyecto"],
            ["m.lopez@aquarius.pe","maria123","Consultor"],
            ["gerencia@aquarius.pe","gerencia2026","Gerencia"],
            ["rrhh@aquarius.pe","rrhh123","RRHH"],
          ].map(([email,pwd,rol],i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.08)",borderRadius:6,padding:"6px 10px"}}>
              <div style={{fontWeight:700,color:"#4a9fd4"}}>{rol}</div>
              <div style={{opacity:.8}}>{email}</div>
              <div style={{fontFamily:"monospace",opacity:.6}}>{pwd}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ==============================================================================
// GUÍA INTERACTIVA — Coach en Vivo
// ==============================================================================

const TOUR_FLUJO_COMERCIAL = [
  {id:"welcome",     modulo:"dashboard",    ancla:"kpi-pipeline", titulo:"👋 Bienvenido a Nexova CRM",
   desc:"Este es tu <strong>Dashboard ejecutivo</strong>. El KPI Pipeline muestra el valor de todas tus oportunidades abiertas. Es tu termómetro comercial.",
   tip:"💡 Un pipeline saludable = 3× tu meta mensual."},
  {id:"crm-kanban",  modulo:"crm",          ancla:null,           titulo:"🎯 CRM — Tablero Kanban",
   desc:"Gestiona leads con <strong>5 etapas</strong>: Prospecto → Calificado → Propuesta → Negociación → Ganado. Arrastra tarjetas para mover etapas.",
   tip:"💡 La temperatura 🔥 HOT se activa automáticamente cuando registras actividad reciente."},
  {id:"nuevo-lead",  modulo:"crm",          ancla:"btn-nuevo-lead", titulo:"➕ Crear un Lead",
   desc:"Haz click en <strong>+ Nuevo Lead</strong>. Ingresa empresa, RUC, contacto, valor estimado y sector. Asigna una temperatura inicial.",
   tip:"💡 Ingresa el RUC exactamente como aparece en SUNAT — es obligatorio para la facturación."},
  {id:"cotizar",     modulo:"rentabilidad", ancla:null,           titulo:"💰 Calculadora de Rentabilidad",
   desc:"Aquí calculas el precio de venta. Ingresa el <strong>personal por cargo</strong> con sus horas, EPP y gastos de campo. El sistema calcula el margen automáticamente.",
   tip:"💡 El objetivo es superar <strong>30% de margen</strong> para cumplir ISO 9001. Si estás en rojo, ajusta horas o precio."},
  {id:"guardar-cot", modulo:"rentabilidad", ancla:null,           titulo:"💾 Guardar Cotización",
   desc:"Una vez que el margen es aceptable, click en <strong>Guardar cotización</strong>. Se vincula al lead automáticamente. Puedes actualizar o crear nueva.",
   tip:"💡 Si el cliente pide cambios, selecciona la cotización y edita — el historial se mantiene."},
  {id:"ejecucion",   modulo:"ejecucion",    ancla:null,           titulo:"🏗️ Ejecución del Proyecto",
   desc:"Proyecto aprobado → pasa aquí. Controla el <strong>Gantt por fases</strong>, sube documentos por entregable, registra horas reales y hace seguimiento de cobros.",
   tip:"💡 Sube el acta de inicio para marcar el primer entregable y que la fase avance automáticamente."},
  {id:"facturacion", modulo:"facturacion",  ancla:null,           titulo:"💳 Facturación y Cobros",
   desc:"Las <strong>cuotas del proyecto</strong> aparecen aquí automáticamente. Registra cada cobro con fecha, voucher y banco. Solo Finanzas puede marcar como cobrado.",
   tip:"💡 Si te equivocas, usa <strong>↩ Revertir</strong> para volver el estado a Pendiente."},
  {id:"reportes",    modulo:"reportes",     ancla:null,           titulo:"📈 Reportes Ejecutivos",
   desc:"Genera reportes <strong>PDF y Excel</strong> con un click: Pipeline, Avance de Proyectos, Control de Horas, Flujo de Cobros. Los marcados con ✦ incluyen análisis IA.",
   tip:"💡 El reporte de Avance de Proyectos incluye Gantt SVG, análisis y recomendaciones automáticas."},
];

const TOUR_MODULOS = [
  {id:"m-dashboard",     modulo:"dashboard",     titulo:"📊 Dashboard Gerencial",
   desc:"Vista ejecutiva con <strong>KPIs en tiempo real</strong>: pipeline activo, proyectos contratados, cobrado vs pendiente, margen promedio y avance de inventario.",
   tip:"💡 Las alertas rojas en el header indican proyectos con margen crítico o entregables vencidos."},
  {id:"m-crm",           modulo:"crm",           titulo:"🎯 CRM Pipeline",
   desc:"Gestión de leads con tablero Kanban, temperatura automática HOT/WARM/COLD, tab de seguimiento con urgencias y sincronización directa con cotizaciones.",
   tip:"💡 El tab Seguimiento muestra los leads que necesitan acción urgente, ordenados por prioridad."},
  {id:"m-rentabilidad",  modulo:"rentabilidad",  titulo:"💰 Calculadora de Rentabilidad",
   desc:"Calcula el precio de venta con personal por cargo (tarifas oficiales), EPP y gastos de campo. Análisis IA de la propuesta y descarga PDF profesional.",
   tip:"💡 El objetivo es superar 30% de margen para cumplir ISO 9001. El semáforo te avisa si estás en riesgo."},
  {id:"m-importleads",   modulo:"importleads",   titulo:"📥 Importar Leads",
   desc:"Importa leads masivamente desde Excel o CSV. El sistema valida campos, detecta duplicados y los distribuye en el pipeline automáticamente según la etapa.",
   tip:"💡 Descarga la plantilla antes de importar para asegurar que los campos coincidan con el formato."},
  {id:"m-ejecucion",     modulo:"ejecucion",     titulo:"🏗️ Ejecución de Proyectos",
   desc:"Gantt de 9 fases, entregables con subida de documentos, control de horas cotizadas vs reales, cronograma de cobros y repositorio de documentos del proyecto.",
   tip:"💡 El informe de avance genera automáticamente un PDF con Gantt, análisis y recomendaciones."},
  {id:"m-calidad",       modulo:"calidad",       titulo:"✅ Control de Calidad",
   desc:"Inventario físico de activos por proyecto. Registra activos con código, serie, estado (conforme/faltante/sobrante/deteriorado) y gestiona el checklist.",
   tip:"💡 Los activos faltantes y sobrantes se reportan automáticamente al generar el informe final."},
  {id:"m-inventario",    modulo:"inventario",    titulo:"📦 Carga de Inventario",
   desc:"Carga masiva de activos inventariados desde Excel. Importa, valida y concilia el inventario físico contra la base contable del cliente.",
   tip:"💡 Usa este módulo para cargar los resultados del inventario de campo antes de la conciliación contable."},
  {id:"m-recursos",      modulo:"recursos",      titulo:"🧰 Gestión de Recursos",
   desc:"Solicita y asigna recursos humanos, materiales y logísticos al cerrar una venta. Gestiona requerimientos de personal, EPP, materiales y etiquetas por proyecto.",
   tip:"💡 Puedes generar la solicitud de recursos directamente desde una cotización aprobada."},
  {id:"m-facturacion",   modulo:"facturacion",   titulo:"💳 Facturación y Cobros",
   desc:"Gestión completa de cobros: cuotas por proyecto, registro con voucher y banco, flujo de caja proyectado a 90 días y estado de cobranza por cliente.",
   tip:"💡 Solo el rol Finanzas puede marcar cuotas como cobradas. Usa ↩ Revertir si hay un error."},
  {id:"m-presupuesto",   modulo:"presupuesto",   titulo:"📋 Control Presupuestal",
   desc:"Comparativo real vs cotizado por proyecto: personal, EPP y gastos. Semáforo de desviación para identificar dónde se están perdiendo márgenes.",
   tip:"💡 Si el % de ejecución supera 110%, el proyecto está en riesgo de sobrecosto — actúa antes de que sea tarde."},
  {id:"m-reportes",      modulo:"reportes",      titulo:"📈 Reportes y Analytics",
   desc:"12 reportes PDF/Excel: Pipeline CRM, Ranking Ejecutivos, Flujo de Cobros, Avance de Proyectos, Real vs Cotizado, Entregables y más. Todos con análisis IA.",
   tip:"💡 Los reportes marcados con ✦ generan un informe ejecutivo completo con gráficas y recomendaciones."},
  {id:"m-rrhh",          modulo:"rrhh",          titulo:"👥 RRHH",
   desc:"Directorio de personal, gestión de carga laboral, evaluaciones de desempeño y asignación de personal a proyectos según disponibilidad y competencias.",
   tip:"💡 Consulta la disponibilidad del equipo antes de comprometer recursos en una nueva propuesta."},
  {id:"m-notificaciones",modulo:"notificaciones",titulo:"🔔 Notificaciones",
   desc:"Centro de alertas del sistema: entregables vencidos, cobros pendientes, leads sin actividad, márgenes en riesgo y actualizaciones de proyectos en tiempo real.",
   tip:"💡 Las alertas críticas en rojo requieren acción inmediata — revísalas al inicio de cada jornada."},
  {id:"m-integraciones", modulo:"integraciones", titulo:"🔗 Integraciones",
   desc:"Conecta Nexova con sistemas externos: correo electrónico, Google Calendar, WhatsApp Business y APIs REST para centralizar todas las comunicaciones.",
   tip:"💡 La integración con email registra automáticamente las comunicaciones con clientes como actividades del lead."},
  {id:"m-config",        modulo:"config",        titulo:"⚙️ Configuración",
   desc:"Administra usuarios y roles (Admin, Comercial, Gerencia, Jefe de Proyecto, Consultor, RRHH), personaliza tarifas oficiales y ajusta los parámetros del sistema.",
   tip:"💡 Solo el Administrador puede crear usuarios, modificar roles y cambiar las tarifas oficiales."},
  {id:"m-manual",        modulo:"manual",        titulo:"📖 Manual de Usuario",
   desc:"Guía completa con instrucciones por módulo, flujos de trabajo, preguntas frecuentes y mejores prácticas para todo el equipo de Aquarius Consulting.",
   tip:"💡 Consulta el manual antes de contactar soporte — la mayoría de dudas están respondidas ahí."},
];



const TOUR_PASOS = TOUR_FLUJO_COMERCIAL;


// Confetti mínimo sin dependencias
function lanzarConfetti() {
  const colors = ["#1D9E75","#4a9fd4","#BA7517","#E24B4A","#1a2e4a"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;";
  document.body.appendChild(container);
  for(let i=0; i<60; i++){
    const p = document.createElement("div");
    const color = colors[Math.floor(Math.random()*colors.length)];
    const size = 6+Math.random()*8;
    const left = Math.random()*100;
    const delay = Math.random()*0.8;
    const dur = 1.5+Math.random()*1;
    p.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};
      border-radius:${Math.random()>0.5?"50%":"2px"};left:${left}%;top:-10px;
      animation:confettiFall ${dur}s ${delay}s ease-in forwards;opacity:0.9;`;
    container.appendChild(p);
  }
  const style = document.createElement("style");
  style.textContent = "@keyframes confettiFall{to{transform:translateY(100vh) rotate(720deg);opacity:0;}}";
  document.head.appendChild(style);
  setTimeout(()=>{ container.remove(); style.remove(); }, 3000);
}

function TourCoach({paso,pasoIdx,totalPasos,onNext,onPrev,onCerrar,onNav,paginaActual}) {
  const [pos, setPos]           = useState({x: window.innerWidth-360, y: window.innerHeight-280});
  const [visible, setVisible]   = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});
  const [celebrando, setCelebrando] = useState(false);
  const ref = useRef(null);

  // Reposicionar al cambiar de paso — siempre dentro del viewport
  useEffect(()=>{
    setVisible(false);
    setCelebrando(false);
    if(!paso) return;
    if(paso.modulo && paso.modulo !== paginaActual){
      onNav(paso.modulo);
    }
    const delay = paso.modulo && paso.modulo !== paginaActual ? 800 : 100;
    const reposicionar = () => {
      // Si tiene ancla, intentar posicionar cerca
      if(paso.ancla){
        const el = document.querySelector('[data-tour="'+paso.ancla+'"], #'+paso.ancla);
        if(el){
          const r   = el.getBoundingClientRect();
          const W   = window.innerWidth;
          const H   = window.innerHeight;
          const bW  = 350; // ancho burbuja
          const bH  = 260; // alto aprox burbuja
          let x = r.left;
          let y = r.bottom + 14;
          // Si se sale por abajo, poner arriba
          if(y + bH > H - 20) y = r.top - bH - 14;
          // Si se sale por la derecha, alinear a la derecha del viewport
          if(x + bW > W - 10) x = W - bW - 10;
          // Nunca fuera de pantalla
          x = Math.max(10, x);
          y = Math.max(60, y);
          setPos({x, y});
          // Resaltar elemento
          el.style.outline = "3px solid #4a9fd4";
          el.style.outlineOffset = "3px";
          el.style.borderRadius = "6px";
          setTimeout(()=>{ if(el){ el.style.outline=""; el.style.outlineOffset=""; } }, 3000);
        } else {
          // Ancla no encontrada — posición por defecto bottom-right
          setPos({x: window.innerWidth-360, y: window.innerHeight-300});
        }
      } else {
        // Sin ancla — bottom-right siempre visible
        setPos({x: window.innerWidth-360, y: window.innerHeight-300});
      }
      setTimeout(()=>setVisible(true), 200);
    };
    const t = setTimeout(reposicionar, delay);
    return ()=>clearTimeout(t);
  },[pasoIdx, paginaActual]);

  // Drag handlers
  const onMouseDown = (e) => {
    if(e.target.tagName==="BUTTON") return;
    setDragging(true);
    setDragOffset({x: e.clientX - pos.x, y: e.clientY - pos.y});
    e.preventDefault();
  };
  useEffect(()=>{
    if(!dragging) return;
    const onMove = (e) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const bW = ref.current ? ref.current.offsetWidth : 350;
      const bH = ref.current ? ref.current.offsetHeight : 260;
      let nx = e.clientX - dragOffset.x;
      let ny = e.clientY - dragOffset.y;
      nx = Math.max(0, Math.min(nx, W-bW));
      ny = Math.max(0, Math.min(ny, H-bH));
      setPos({x:nx, y:ny});
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return ()=>{ window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
  },[dragging, dragOffset]);

  const handleNext = () => {
    const esUltimo = pasoIdx >= totalPasos-1;
    if(esUltimo){
      lanzarConfetti();
      setCelebrando(true);
      setTimeout(()=>{ setCelebrando(false); onCerrar(); }, 2500);
    } else {
      if([1,2,3,5,6].includes(pasoIdx)) lanzarConfetti();
      onNext();
    }
  };

  if(!paso) return null;

  return (
    <>
      <div ref={ref} style={{
        position:"fixed", left:pos.x, top:pos.y,
        width:340, zIndex:8000,
        background:"var(--card)",
        border:"2px solid "+C.blue,
        borderRadius:14,
        boxShadow:"0 12px 40px rgba(0,0,0,0.3)",
        opacity:visible?1:0,
        transform:visible?"translateY(0)":"translateY(8px)",
        transition:dragging?"none":"opacity .25s, transform .25s",
        cursor:dragging?"grabbing":"grab",
        userSelect:"none",
      }} onMouseDown={onMouseDown}>
        {/* Header */}
        <div style={{background:C.navy,padding:"9px 14px",borderRadius:"12px 12px 0 0",
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13}}>🎓</span>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",letterSpacing:0.3}}>GUÍA NEXOVA</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.5)",marginLeft:4}}>⠿ arrastrar</span>
          </div>
          <button onClick={onCerrar} onMouseDown={e=>e.stopPropagation()}
            style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",
              borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:11}}>
            ✕
          </button>
        </div>

        {/* Progreso */}
        <div style={{padding:"8px 14px 0",display:"flex",gap:2}}>
          {Array.from({length:totalPasos},(_,i)=>(
            <div key={i} style={{flex:1,height:3,borderRadius:2,transition:"background .3s",
              background:i<pasoIdx?"#1D9E75":i===pasoIdx?C.blue:"var(--bd)"}}/>
          ))}
        </div>
        <div style={{padding:"2px 14px",fontSize:9,color:"var(--t3)",textAlign:"right"}}>
          {pasoIdx+1} / {totalPasos}
        </div>

        {/* Contenido */}
        <div style={{padding:"10px 14px"}} onMouseDown={e=>e.stopPropagation()}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--t1)",marginBottom:7,lineHeight:1.3}}>
            {celebrando?"🎉 ¡Guía completada!":paso.titulo}
          </div>
          {celebrando?(
            <div style={{fontSize:12,color:C.teal,fontWeight:600,textAlign:"center",padding:"6px 0"}}>
              ¡Ya conoces el flujo completo!<br/>Estás listo para usar Nexova CRM Pro.
            </div>
          ):(
            <>
              <div style={{fontSize:11,color:"var(--t2)",lineHeight:1.65,marginBottom:8}}
                dangerouslySetInnerHTML={{__html:paso.desc}}/>
              {paso.tip&&(
                <div style={{background:"rgba(74,159,212,.08)",border:"1px solid rgba(74,159,212,.2)",
                  borderRadius:7,padding:"6px 10px",fontSize:10,color:C.blue,lineHeight:1.5}}
                  dangerouslySetInnerHTML={{__html:paso.tip}}/>
              )}
            </>
          )}
        </div>

        {/* Botones */}
        {!celebrando&&(
          <div style={{padding:"8px 14px",borderTop:"1px solid var(--bd)",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            background:"var(--hv)",borderRadius:"0 0 12px 12px"}}
            onMouseDown={e=>e.stopPropagation()}>
            <button onClick={onPrev} disabled={pasoIdx===0}
              style={{background:"none",border:"1px solid var(--bd)",borderRadius:6,
                padding:"5px 12px",cursor:pasoIdx===0?"not-allowed":"pointer",
                fontSize:11,color:"var(--t2)",opacity:pasoIdx===0?0.4:1}}>
              ← Ant.
            </button>
            <button onClick={handleNext}
              style={{background:C.blue,border:"none",borderRadius:6,
                padding:"6px 16px",cursor:"pointer",fontSize:12,
                fontWeight:700,color:"#fff"}}>
              {pasoIdx>=totalPasos-1?"🏁 Terminar":"Siguiente →"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}


function AppShell({usuario,onLogout}) {
  // Esperar a que el check de versión termine antes de cargar datos
  const [versionOk, setVersionOk] = useState(false);
  useVersionCheck(() => setVersionOk(true));

  const [proyectos,    setProyectos,   proyCargado]  = usePersistedState("proyectos",   PROYECTOS_DEFAULT);
  const [leads,        setLeads,       leadsCargado]  = usePersistedState("leads",       LEADS_DEFAULT);
  const [cotizaciones, setCotizaciones,cotsCargado]   = usePersistedState("cotizaciones",COTS_DEFAULT);
  const [usuarios,     setUsuarios,    usrCargado]    = usePersistedState("usuarios",    USUARIOS_INIT);
  const [tarifas,      setTarifas,     tarifCargado]  = usePersistedState("tarifas",     TARIFAS_OFICIALES);
  const [sysConfig,    setSysConfig,   cfgCargado]    = usePersistedState("sysConfig",   {margenObj:30,tc:3.60,moneda:"USD"});

  const [page,setPage]           = useState(INICIO_ROL[usuario.rol]||"dashboard");
  const [highlights,setHighlights] = useState({});
  const [col, setCol]            = useState(false);
  const [dark,setDark]           = useState(false);
  const [load,setLoad]           = useState(false);
  const [saveStatus,setSaveStatus] = useState(null);
  const {ts,show}                = useToast();

  const todosCargado = versionOk; // Esperar reset de versión antes de cargar

  useEffect(()=>{
    if (!todosCargado) setSaveStatus("loading");
    else { setSaveStatus("saved"); setTimeout(()=>setSaveStatus(null),2000); }
  },[todosCargado]);

  const wrapSet = (setter) => (valOrFn) => {
    setSaveStatus("saving");
    setter(valOrFn);
    setTimeout(()=>setSaveStatus("saved"),600);
    setTimeout(()=>setSaveStatus(null),2500);
  };

  const [periodo,    setPeriodo]    = useState("mensual");
  const [tourActivo, setTourActivo] = useState(false);
  const [tourModo,   setTourModo]   = useState("comercial"); // "comercial" | "modulos"
  const [tourPaso,   setTourPaso]   = useState(0);
  const [tourError,  setTourError]  = useState(null);
  const [tourExito,  setTourExito]  = useState(null);

  const tourIniciar = (modo="comercial") => { 
    setTourModo(modo); 
    setTourActivo(true); 
    setTourPaso(0); 
    show("🎓 Guía "+(modo==="modulos"?"de módulos":"del flujo comercial")+" activada","success"); 
  };
  const tourCerrar  = () => { setTourActivo(false); setTourError(null); };
  const tourNext    = () => {
    const pasos = tourModo==="modulos" ? TOUR_MODULOS : TOUR_FLUJO_COMERCIAL;
    if(tourPaso < pasos.length-1){ 
      setTourPaso(p=>p+1); 
    } else { 
      lanzarConfetti();
      setTourActivo(false); 
      toast("🎉 ¡Tour completado! Ya conoces "+(tourModo==="modulos"?"todos los módulos":"el flujo comercial completo")+".","success"); 
    } 
  };
  const tourPrev    = () => { if(tourPaso>0) setTourPaso(p=>p-1); };
  const tourNavegar = (modulo) => { nav(modulo); };
  const marcarNotiLeida = (id) => setNotifsLeidas(prev=>({...prev,[id]:true}));

  // Auto-migrar cotizaciones sin personal al cargar
  useEffect(()=>{
    if(!cotsCargado) return;
    const sinPersonal = cotizaciones.some(c=>!c.personal||c.personal.length===0);
    if(sinPersonal){
      const migradas = cotizaciones.map(c=>{
        if(c.personal?.length>0) return c;
        const base = COTS_DEFAULT.find(d=>d.id===c.id||d.cliente===c.cliente);
        return base ? {...c,personal:base.personal} : c;
      });
      const ids=migradas.map(c=>c.id);
      const nuevas=COTS_DEFAULT.filter(d=>!ids.includes(d.id));
      setCotizaciones([...migradas,...nuevas]);
    }
  },[cotsCargado]);

  const acceso = ACCESO_ROL[usuario.rol]||[];
  const alertas = proyectos.length>0&&todosCargado ? generarAlertas(proyectos,leads) : [];
  const alertasCrit = alertas.filter(a=>a.lv==="critical").length;
  // Notificaciones enriquecidas para el panel (dinámicas desde datos reales)
  const notifsPanel = proyectos.length>0&&todosCargado
    ? generarNotifsDeProyectos(proyectos, cotizaciones, leads)
    : NOTIF_INIT;
  const [notifVisto, setNotifVisto] = React.useState(false);
  // Resetear badge cuando llegan nuevas alertas críticas
  React.useEffect(()=>{ if(alertasCrit>0) setNotifVisto(false); },[alertasCrit]);
  // B.3 — notifs derivadas de alertas reales + historial de leídas
  const [notifsLeidas, setNotifsLeidas] = useState({});
  const notifs = React.useMemo(()=>{
    // Prioridad: alertas del motor → notifsPanel (datos reales) → NOTIF_INIT
    if(alertas.length>0){
      return alertas.map((a,i)=>({
        id:"DIN"+i,
        tipo:a.lv==="critical"?"critico":a.lv==="warning"?"alerta":a.lv==="success"?"exito":"info",
        icono:a.lv==="critical"?"🔴":a.lv==="warning"?"🟡":a.lv==="success"?"🟢":"🔵",
        titulo:(a.tx||"Alerta del sistema").substring(0,60),
        cuerpo:a.tx||"",
        fecha:new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"}),
        leida:!!notifsLeidas["DIN"+i],
        modulo:a.tag==="CRM"?"crm":a.tag==="Entregable"?"ejecucion":a.tag==="Cobro"?"facturacion":a.tag==="Horas"?"rrhh":"dashboard",
      }));
    }
    // Sin alertas del motor: usar notifsPanel (generadas desde datos reales)
    if(notifsPanel&&notifsPanel.length>0){
      return notifsPanel.map(n=>({...n,leida:!!notifsLeidas[n.id]}));
    }
    return NOTIF_INIT.map(n=>({...n,leida:!!notifsLeidas[n.id]}));
  },[alertas,notifsLeidas,notifsPanel]);

  const [navLeadId, setNavLeadId] = useState("");
  const nav = (id, leadId="") => {
    if(id==="notificaciones") setNotifVisto(true);
    if (!acceso.includes(id)){show("No tienes acceso a ese módulo","error");return;}
    setNavLeadId(leadId);
    if (id===page){ if(leadId) setNavLeadId(leadId); return; }
    setPage(id);
  };

  const handleReset = async () => {
    await DB.set("__data_version__", DATA_VERSION);
    await DB.set("proyectos",   PROYECTOS_DEFAULT);
    await DB.set("leads",       LEADS_DEFAULT);
    await DB.set("cotizaciones",COTS_DEFAULT);
    await DB.set("usuarios",    USUARIOS_INIT);
    await DB.set("tarifas",     TARIFAS_OFICIALES);
    await DB.set("sysConfig",   {margenObj:30,tc:3.60,moneda:"USD"});
    setProyectos(PROYECTOS_DEFAULT);
    setLeads(LEADS_DEFAULT);
    setCotizaciones(COTS_DEFAULT);
    setUsuarios(USUARIOS_INIT);
    setTarifas(TARIFAS_OFICIALES);
    setSysConfig({margenObj:30,tc:3.60,moneda:"USD"});
    show("✓ Datos restablecidos a los valores por defecto","success");
  };

  const renderPage = () => {
    if (!todosCargado||load) return (
      <div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0d1825",gap:16}}>
        <Logo s={52} bg={true}/>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:13,fontFamily:"sans-serif"}}>Cargando Nexova CRM...</div>
        <div style={{width:160,height:3,background:"rgba(255,255,255,.1)",borderRadius:3,overflow:"hidden"}}>
          <div style={{width:"60%",height:"100%",background:"#1D9E75",borderRadius:3,animation:"pls 1.4s ease-in-out infinite"}}/>
        </div>
      </div>
    );
    switch(page) {
      case "dashboard":    return <Dashboard    proyectos={proyectos} leads={leads} cotizaciones={cotizaciones} alertas={alertas} toast={show} usuario={usuario} periodo={periodo} setPeriodo={setPeriodo}/>;
      case "crm":          return <CRM key="crm-module" leads={leads} setLeads={wrapSet(setLeads)} toast={show} usuario={usuario} onNav={nav} cotizaciones={cotizaciones} setCotizaciones={wrapSet(setCotizaciones)} onTourAction={tourActivo?tourNext:null}/>;
      case "importleads":  return <ImportLeads  leads={leads} setLeads={wrapSet(setLeads)} toast={show} usuario={usuario}/>;
      case "rentabilidad": return <Rentabilidad leads={leads} cotizaciones={cotizaciones} setCotizaciones={wrapSet(setCotizaciones)} toast={show} usuario={usuario} tarifas={tarifas} setTarifas={wrapSet(setTarifas)} sysConfig={sysConfig} navLeadId={navLeadId} onClearNavLead={()=>setNavLeadId("")} onTourAction={tourActivo?tourNext:null}/>;
      case "recursos":     return <GestionRecursos toast={show} usuario={usuario} proyectos={proyectos} cotizaciones={cotizaciones}/>;
      case "ejecucion":    return <Ejecucion    proyectos={proyectos} setProyectos={wrapSet(setProyectos)} toast={show} usuario={usuario} cotizaciones={cotizaciones}/>;
      case "presupuesto":  return <Presupuesto  proyectos={proyectos} toast={show} cotizaciones={cotizaciones}/>;
      case "calidad":      return <ControlCalidad toast={show} usuario={usuario} proyectos={proyectos} inventariosDatos={proyectos.flatMap(p=>(p.inventarios||[]).map(inv=>({...inv,proyId:p.id,cliente:p.cliente})))}/>;
      case "inventario":   return <CargaInventario toast={show} usuario={usuario} proyectos={proyectos} setProyectos={wrapSet(setProyectos)}/>;
      case "reportes":     return <Reportes     proyectos={proyectos} cotizaciones={cotizaciones} leads={leads} toast={show} periodo={periodo} setPeriodo={setPeriodo}/>;
      case "facturacion":  return <Facturacion  proyectos={proyectos} setProyectos={wrapSet(setProyectos)} toast={show} usuario={usuario}/>;
      case "propuestas":   // fusionado — redirigir
      case "rentabilidad_prop": return <Propuestas   cotizaciones={cotizaciones} setCotizaciones={wrapSet(setCotizaciones)} toast={show} usuario={usuario} setProyectos={wrapSet(setProyectos)} proyectos={proyectos}/>;
      case "rrhh":         return <RRHH         toast={show} usuario={usuario} proyectos={proyectos} cotizaciones={cotizaciones}/>;
      case "notificaciones":  return <PanelNotificaciones usuario={usuario} onNav={nav} alertasDin={alertas}/>;
      case "integraciones":   return <Integraciones   toast={show} usuario={usuario}/>;
      case "manual":          return <ManualUsuario/>;
      case "config":       return <Configuracion usuarios={usuarios} setUsuarios={wrapSet(setUsuarios)} toast={show} tarifas={tarifas} setTarifas={wrapSet(setTarifas)} sysConfig={sysConfig} setSysConfig={wrapSet(setSysConfig)}/>;
      default:             return null;
    }
  };

  return (
    <div className="app" data-dark={dark}>
      <Sidebar active={page} onNav={nav} col={col} onToggle={()=>setCol(c=>!c)} usuario={usuario} alertasCrit={notifVisto ? 0 : alertasCrit} highlights={highlights}/>
      <div className="main">
        <Header page={page} dark={dark} onDark={()=>setDark(d=>!d)} toast={show} usuario={usuario} onLogout={onLogout} alertasCrit={alertasCrit} onReset={handleReset} notifs={notifs} onMarcarLeida={marcarNotiLeida} onNavNotif={(mod)=>{setNotifs(p=>p.map(n=>({...n,leida:true}))); navTo(mod);}} tourActivo={tourActivo} onTourToggle={(modo)=>tourActivo?tourCerrar():tourIniciar(modo||"comercial")}/>
        <div className="cnt">{renderPage()}</div>
      </div>
      <div className="toast-c">
        {ts.map(t=>(
          <div key={t.id} className="toast">
            <div style={{width:20,height:20,borderRadius:"50%",background:TCOL[t.type]+"20",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{color:TCOL[t.type],fontSize:10,fontWeight:700}}>{t.type==="success"?"✓":t.type==="error"?"✕":t.type==="warning"?"!":"i"}</span>
            </div>
            <span style={{flex:1}}>{t.msg}</span>
          </div>
        ))}
      </div>
      <SaveIndicator status={saveStatus}/>
      <ChatAsistente usuario={usuario} proyectos={proyectos} leads={leads}/>

      {/* -- Onboarding interactivo -- */}
      {tourActivo&&(
        <TourCoach
          paso={(tourModo==="modulos"?TOUR_MODULOS:TOUR_FLUJO_COMERCIAL)[tourPaso]}
          pasoIdx={tourPaso}
          totalPasos={(tourModo==="modulos"?TOUR_MODULOS:TOUR_FLUJO_COMERCIAL).length}
          onNext={tourNext}
          onPrev={tourPrev}
          onCerrar={tourCerrar}
          onNav={nav}
          paginaActual={page}
          tourModo={tourModo}
        />
      )}
    </div>
  );
}

// ==============================================================================
// ROOT
// ==============================================================================
// ROOT
// ==============================================================================
export default function NexovaCRMPro() {
  const [sesion,  setSesion]  = useState(null);
  const [splash,  setSplash]  = useState(false);
  const [usuariosDB] = usePersistedState("usuarios", USUARIOS_INIT);
  const usuariosLogin = (usuariosDB && usuariosDB.length > 0) ? usuariosDB : USUARIOS_INIT;

  const handleLogin  = u => { setSesion(u); setSplash(true); setTimeout(()=>setSplash(false),2000); };
  const handleLogout = () => { setSesion(null); setSplash(false); };

  if (!sesion) return <><style>{css}</style><LoginScreen onLogin={handleLogin} usuariosDB={usuariosLogin}/></>;
  return (
    <>
      <style>{css}</style>
      {splash && <SplashWelcome usuario={sesion}/>}
      <AppShell usuario={sesion} onLogout={handleLogout}/>
    </>
  );
}
