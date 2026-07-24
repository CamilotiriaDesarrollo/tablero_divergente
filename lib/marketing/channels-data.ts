// lib/marketing/channels-data.ts
// Caracterizacion de redes sociales por avatar (pestana Canales). Contenido de
// referencia transcrito del documento fuente
// "Ficha_Caracterizacion_Redes_Sociales_por_Avatar_Divergente.docx".
// Es material de lectura estrategica: no vive en la base, se estructura aqui como
// datos tipados y lo renderiza channels-view.tsx. Los guiones largos del original
// se sustituyen por " · " (guardrail de diseno: sin em-dashes en la interfaz).

/** Un bloque de contenido dentro de un canal. Union cerrada para render tipado. */
export type ChannelBlock =
  | { kind: "prose"; label: string; body: string }
  | { kind: "priority"; label: string; items: { level: string; avatar: string }[] }
  | { kind: "bullets"; label: string; items: string[] }
  | { kind: "columns"; label: string; columns: { label?: string; items: string[] }[] }
  | { kind: "table"; label: string; headers: string[]; rows: string[][] }
  | { kind: "definitions"; label: string; items: { term: string; desc: string }[] }
  | { kind: "lines"; label: string; groups: { avatar: string; items: string[] }[] }
  | { kind: "steps"; label: string; items: string[] }
  | { kind: "checklist"; label: string; items: string[] };

export interface Channel {
  /** Numero de seccion del documento ("01", "02", ...). */
  number: string;
  name: string;
  /** slug de simpleicons para el logo (ChannelMark). */
  slug: string;
  /** color hex sin '#'. */
  color: string;
  tagline: string;
  blocks: ChannelBlock[];
}

export interface AvatarChannelMap {
  avatar: string;
  personas: string;
  primary: string;
  secondary: string;
  conversion: string;
  offer: string;
}

// ---------- Panorama general ----------

export const CHANNELS_OVERVIEW = {
  title: "Caracterizacion de redes sociales",
  subtitle: "Estrategia por canal, avatar y oferta",
  intro:
    "Una guia para entrar a cada red y construir su estrategia sin dispersar el contenido.",
  principle: {
    title: "Principio de concentracion",
    body: "Cada avatar tiene una red principal, una red secundaria y un canal de conversion. La red principal recibe contenido original; la secundaria recibe adaptaciones o profundizacion; el canal de conversion conduce a la oferta.",
    note: "La estructura evita producir contenido distinto para todas las plataformas. La regla operativa es concentrar la mayor parte del esfuerzo en la red principal y reutilizar estrategicamente en la secundaria.",
  },
  matrix: [
    {
      avatar: "Profesional integrador",
      personas: "Mateo / Mariana",
      primary: "YouTube",
      secondary: "LinkedIn",
      conversion: "Landing, correo o webinar",
      offer: "Bootcamp",
    },
    {
      avatar: "Decisor de transformacion",
      personas: "Jaime / Diana",
      primary: "LinkedIn",
      secondary: "YouTube",
      conversion: "CRM, correo y reunion",
      offer: "B2B y formacion empresarial",
    },
    {
      avatar: "Profesional que construye proyectos",
      personas: "Valentina / Juan",
      primary: "Instagram",
      secondary: "YouTube",
      conversion: "Skool y mensajes directos",
      offer: "Comunidad Skool",
    },
    {
      avatar: "Emprendedor operador",
      personas: "Andres / Laura",
      primary: "Instagram",
      secondary: "YouTube Shorts",
      conversion: "WhatsApp",
      offer: "Soluciones digitales y automatizaciones",
    },
  ] satisfies AvatarChannelMap[],
  editorialRule: {
    title: "Regla editorial definitiva",
    bullets: [
      "Una pieza debe tener un avatar prioritario, un problema concreto, una promesa y una llamada a la accion.",
      "No se publica el mismo mensaje sin adaptacion: cada red cumple una funcion diferente.",
      "CRM, correo, WhatsApp, Skool y reuniones son canales de conversion o relacion; no se confunden con redes editoriales.",
      "TikTok queda fuera de la arquitectura prioritaria. Puede utilizarse ocasionalmente para reutilizacion, pero sin calendario propio.",
      "Las tres redes donde Divergente crea estrategia original son YouTube, LinkedIn e Instagram. YouTube Shorts funciona como extension de Instagram para Andres / Laura.",
    ],
  },
};

// ---------- Canales ----------

export const CHANNELS: Channel[] = [
  {
    number: "01",
    name: "YouTube",
    slug: "youtube",
    color: "FF0000",
    tagline: "Profundidad, metodologia, formacion y biblioteca de autoridad.",
    blocks: [
      {
        kind: "prose",
        label: "Funcion del canal",
        body: "YouTube es el espacio donde Divergente explica procesos completos, demuestra soluciones, organiza metodologias y construye autoridad acumulativa. El canal debe responder preguntas reales y conectar la necesidad del espectador con una ruta de aprendizaje, una oferta o un caso de aplicacion.",
      },
      {
        kind: "priority",
        label: "Avatares y prioridad",
        items: [
          { level: "Principal", avatar: "Mateo / Mariana · Profesional integrador" },
          { level: "Secundario", avatar: "Valentina / Juan · Profundizacion para construir proyectos" },
          { level: "Secundario", avatar: "Jaime / Diana · Validacion y biblioteca ejecutiva" },
          { level: "Apoyo puntual", avatar: "Andres / Laura · Casos completos, no una linea larga propia" },
        ],
      },
      {
        kind: "prose",
        label: "Promesa editorial",
        body: "Divergente no ensena herramientas aisladas. Ensena a pensar, disenar y aplicar tecnologia, datos e inteligencia artificial en problemas reales, con criterio estrategico, analitico, critico y creativo.",
      },
      {
        kind: "table",
        label: "Que encuentra cada avatar",
        headers: ["Avatar", "Que viene a buscar", "Que debe encontrar", "Conversion"],
        rows: [
          [
            "Mateo / Mariana",
            "Aplicar IA y tecnologia en su trabajo; desarrollar capacidades profesionales.",
            "Metodologias, tutoriales contextualizados, rediseno de procesos, habilidades del futuro y casos profesionales.",
            "Bootcamp, webinar o recurso.",
          ],
          [
            "Valentina / Juan",
            "Estructurar y hacer avanzar un proyecto propio.",
            "Procesos de construccion, validacion, contenidos, audiencias, datos, creatividad, tecnologia y bienestar.",
            "Skool o comunidad.",
          ],
          [
            "Jaime / Diana",
            "Verificar autoridad, comprender una decision o revisar un caso.",
            "Casos ejecutivos, conferencias, entrevistas y metodologias de transformacion.",
            "Reunion, caso o contacto B2B.",
          ],
          [
            "Andres / Laura",
            "Confirmar que una solucion concreta puede funcionar en su negocio.",
            "Casos completos por sector y demostraciones de sistemas.",
            "WhatsApp o diagnostico.",
          ],
        ],
      },
      {
        kind: "columns",
        label: "Formatos y contenidos",
        columns: [
          {
            items: [
              "Videos explicativos y tutoriales con contexto.",
              "Series tematicas y listas de reproduccion por problema o avatar.",
              "Casos completos: problema, proceso, solucion, resultados y aprendizajes.",
              "Entrevistas con especialistas, artistas, emprendedores y lideres.",
            ],
          },
          {
            items: [
              "Conferencias, clases abiertas y fragmentos extendidos de laboratorios.",
              "Diarios de construccion de proyectos y pruebas de herramientas.",
              "Comparaciones y analisis criticos de metodologias o soluciones.",
            ],
          },
        ],
      },
      {
        kind: "lines",
        label: "Lineas de contenido por avatar",
        groups: [
          {
            avatar: "Mateo / Mariana · Profesional integrador",
            items: [
              "Pensamiento estrategico, critico, analitico y creativo.",
              "IA aplicada al trabajo y a la coordinacion de proyectos.",
              "Rediseno de procesos antes de automatizar.",
              "Habilidades profesionales del futuro.",
              "Como pasar de usar ChatGPT a disenar soluciones.",
              "Como trabajar con equipos tecnicos sin ser programador.",
              "Casos profesionales y automatizaciones explicadas con criterio.",
              "Metodologias Divergentes para tomar decisiones y ejecutar.",
            ],
          },
          {
            avatar: "Valentina / Juan · Construccion de proyectos",
            items: [
              "Como convertir una idea en un proyecto estructurado.",
              "IA sin perder identidad ni proposito.",
              "Investigacion de audiencias y comunidades.",
              "Sistemas de contenido para profesionales independientes.",
              "Datos y validacion de ideas con recursos limitados.",
              "Diseno de experiencias culturales o turisticas.",
              "Creatividad, tecnologia, bienestar y formas de trabajo.",
              "Diarios, entrevistas y series: construir un proyecto desde cero.",
            ],
          },
          {
            avatar: "Jaime / Diana · Biblioteca de autoridad",
            items: [
              "Casos completos de transformacion organizacional.",
              "Gestion de equipos que utilizan IA.",
              "Criterios para priorizar inversiones tecnologicas.",
              "Gobernanza, seguridad, conocimiento institucional y riesgos.",
              "Conferencias, entrevistas y analisis para directivos.",
              "Errores de implementacion y lecciones de proyectos.",
            ],
          },
          {
            avatar: "Andres / Laura · Casos completos puntuales",
            items: [
              "Caso de una tienda de discos.",
              "Caso de un estudio de yoga o bienestar.",
              "Caso de un restaurante o comercio pequeno.",
              "Demostracion de reservas, seguimiento o agente de WhatsApp.",
              "Antes y despues de un sistema sencillo.",
              "No se crea una linea extensa: son piezas de validacion y cierre.",
            ],
          },
        ],
      },
      {
        kind: "definitions",
        label: "Decisiones para YouTube",
        items: [
          { term: "Tono", desc: "Claro, riguroso, practico y critico; sin tecnicismos innecesarios ni promesas infladas." },
          { term: "Titulos", desc: "Partir del problema, la decision o el resultado; no unicamente del nombre de una herramienta." },
          { term: "Miniaturas", desc: "Promesa visual sencilla, pocos elementos y una tension reconocible." },
          { term: "CTA Mateo / Mariana", desc: "Bootcamp, webinar, guia o siguiente video de la serie." },
          { term: "CTA Valentina / Juan", desc: "Comunidad Skool, recurso o conversacion en Instagram." },
          { term: "CTA Jaime / Diana", desc: "Caso, contacto, reunion o contenido ejecutivo relacionado." },
          { term: "CTA Andres / Laura", desc: "Diagnostico por WhatsApp o caso sectorial." },
          { term: "Evitar", desc: "Tutoriales aislados sin contexto, listas infinitas de herramientas, contenido sin avatar y llamados a varias ofertas." },
        ],
      },
    ],
  },
  {
    number: "02",
    name: "LinkedIn",
    slug: "linkedin",
    color: "0A66C2",
    tagline: "Decision empresarial, liderazgo, reputacion y demanda B2B.",
    blocks: [
      {
        kind: "prose",
        label: "Funcion del canal",
        body: "LinkedIn es el espacio donde Divergente traduce su experiencia en decisiones para lideres, demuestra resultados y construye legitimidad frente a organizaciones. No es un duplicado de YouTube. Debe convertir conocimiento y casos en criterios ejecutivos, marcos de decision y conversaciones comerciales.",
      },
      {
        kind: "priority",
        label: "Avatares y prioridad",
        items: [
          { level: "Principal", avatar: "Jaime / Diana · Decisor de transformacion" },
          { level: "Secundario", avatar: "Mateo / Mariana · Profesional integrador" },
          { level: "No prioritarios", avatar: "Valentina / Juan y Andres / Laura, salvo casos B2B especificos" },
        ],
      },
      {
        kind: "prose",
        label: "Promesa editorial",
        body: "La transformacion tecnologica no comienza comprando herramientas. Comienza comprendiendo el problema, redisenando procesos, organizando equipos y tomando mejores decisiones.",
      },
      {
        kind: "table",
        label: "Lineas de contenido",
        headers: ["Linea", "Contenido que se construye", "Avatar", "CTA"],
        rows: [
          [
            "Decision y liderazgo",
            "Criterios para priorizar IA, automatizacion, datos y desarrollo; preguntas que un directivo debe hacer.",
            "Jaime / Diana",
            "Caso, guia ejecutiva o reunion.",
          ],
          [
            "Casos y resultados",
            "Problema, intervencion, resultado, limites, aprendizajes y siguiente decision.",
            "Jaime / Diana",
            "Contacto B2B o conversacion.",
          ],
          [
            "Equipos y adopcion",
            "Como dirigir equipos que usan IA; roles, capacidades, gobernanza, conocimiento y cambio.",
            "Jaime / Diana",
            "Formacion empresarial o diagnostico.",
          ],
          [
            "Procesos y riesgos",
            "Por que no automatizar procesos obsoletos; seguridad, privacidad, proveedores y sostenibilidad.",
            "Jaime / Diana",
            "Reunion o contenido extendido.",
          ],
          [
            "Desarrollo profesional",
            "Reflexiones y marcos derivados de YouTube sobre capacidades del profesional integrador.",
            "Mateo / Mariana",
            "Video, bootcamp o webinar.",
          ],
        ],
      },
      {
        kind: "columns",
        label: "Formatos y contenidos",
        columns: [
          {
            items: [
              "Publicaciones de opinion respaldadas por experiencia, datos o casos.",
              "Carruseles con marcos de decision, procesos y aprendizajes.",
              "Casos breves con una tension, una intervencion y un resultado.",
              "Documentos descargables, guias ejecutivas y checklists.",
            ],
          },
          {
            items: [
              "Fragmentos de YouTube adaptados con contexto profesional.",
              "Preguntas para lideres, coordinadores y responsables de areas.",
              "Resultados de proyectos, conferencias y aprendizajes institucionales.",
            ],
          },
        ],
      },
      {
        kind: "bullets",
        label: "Reglas para LinkedIn",
        items: [
          "Cada publicacion debe responder una decision, un riesgo, un problema de equipo o un resultado organizacional.",
          "La autoridad se demuestra con claridad metodologica y casos, no con lenguaje grandilocuente.",
          "El contenido de Mateo / Mariana llega como adaptacion: reflexion, carrusel, fragmento o marco profesional.",
          "CRM y correo realizan el seguimiento; no son redes secundarias.",
          "Evitar contenido generico de herramientas, promociones sin contexto, estilo de vida sin relacion estrategica y multiples llamados a la accion.",
        ],
      },
    ],
  },
  {
    number: "03",
    name: "Instagram",
    slug: "instagram",
    color: "E4405F",
    tagline: "Identidad, relacion, comunidad y demostracion visual de soluciones.",
    blocks: [
      {
        kind: "prose",
        label: "Funcion del canal",
        body: "Instagram tiene dos rutas editoriales principales que deben convivir sin mezclarse dentro de una misma pieza: una ruta de comunidad y construccion de proyectos para Valentina / Juan, y una ruta de soluciones concretas para Andres / Laura. Cada publicacion debe llevar una senal clara de a quien habla, que problema aborda y cual es su siguiente paso.",
      },
      {
        kind: "table",
        label: "Rutas editoriales",
        headers: ["Ruta editorial", "Avatar", "Que debe provocar", "Conversion"],
        rows: [
          [
            "Construye tu proyecto",
            "Valentina / Juan",
            "Identificacion con la filosofia, los procesos y la comunidad Divergente.",
            "Skool, YouTube o mensaje directo.",
          ],
          [
            "Haz que tu negocio funcione",
            "Andres / Laura",
            "Reconocimiento rapido de un problema y confianza en una solucion concreta.",
            "WhatsApp y diagnostico.",
          ],
        ],
      },
      {
        kind: "prose",
        label: "Valentina / Juan · Relato principal",
        body: "Tecnologia, creatividad y metodo para construir proyectos con proposito. Instagram debe mostrar el universo Divergente y hacer visible como se aprende, se experimenta y se avanza acompanado.",
      },
      {
        kind: "columns",
        label: "Comunidad y construccion (Valentina / Juan)",
        columns: [
          {
            label: "Contenidos",
            items: [
              "Vida y practica Divergente.",
              "Procesos creativos y detras de camaras.",
              "Construccion de proyectos y aprendizajes reales.",
              "Herramientas utilizadas en situaciones concretas.",
              "Tecnologia combinada con creatividad y pensamiento.",
              "Bienestar, presencia y formas de trabajo.",
              "Laboratorios, talleres y fragmentos de clases.",
              "Historias de miembros y proyectos de la comunidad.",
              "Carruseles con metodologias.",
              "Errores, bloqueos, dispersion y maneras de avanzar.",
            ],
          },
          {
            label: "Formatos y ruta",
            items: [
              "Reels: ideas, procesos, reflexiones y escenas de comunidad.",
              "Carruseles: metodologias, preguntas y marcos aplicables.",
              "Historias: conversacion, seguimiento, agenda y vida del proyecto.",
              "Publicaciones: identidad, casos y relato de marca.",
              "Mensajes directos: resolver dudas y conducir a Skool.",
              "YouTube: profundizacion de los temas que nacen en Instagram.",
              "Ruta: Instagram → YouTube → Skool.",
            ],
          },
        ],
      },
      {
        kind: "prose",
        label: "Promesa para Valentina / Juan",
        body: "Aqui no solo encuentras herramientas: encuentras una forma de pensar, organizar y desarrollar tus proyectos junto a otras personas.",
      },
      {
        kind: "prose",
        label: "Andres / Laura · Relato principal",
        body: "Te mostramos que problema puede resolverse, como funcionaria la solucion y que cambio produciria en tu negocio. No se vende formacion de primera mano: se venden sistemas, automatizaciones y soluciones sencillas.",
      },
      {
        kind: "columns",
        label: "Soluciones para pequenos negocios (Andres / Laura)",
        columns: [
          {
            label: "Contenidos",
            items: [
              "Antes y despues de un proceso.",
              "Problema y solucion en menos de un minuto.",
              "Sistemas y automatizaciones funcionando.",
              "Casos de restaurantes, estudios de yoga, consultorios, turismo, tiendas y comercios.",
              "Clientes perdidos por falta de seguimiento.",
              "WhatsApp, reservas, citas, pedidos y cotizaciones.",
              "Tareas repetitivas que pueden simplificarse.",
              "Calculos sencillos de tiempo o oportunidades perdidas.",
              "Testimonios y resultados.",
              "Que automatizar y que debe seguir siendo humano.",
            ],
          },
          {
            label: "Lenguaje y llamada a la accion",
            items: [
              "Hablar de clientes, tiempo, ventas, reservas, pedidos, seguimiento y organizacion.",
              "Evitar iniciar con arquitectura, agentes autonomos, infraestructura o terminos tecnicos.",
              "Mostrar una solucion pequena, comprensible y escalable.",
              "CTA principal: Escribenos por WhatsApp y revisamos si esto aplica a tu negocio.",
              "Ruta: Instagram → WhatsApp → diagnostico → propuesta → implementacion.",
            ],
          },
        ],
      },
      {
        kind: "table",
        label: "Reglas de convivencia",
        headers: ["Regla", "Aplicacion practica"],
        rows: [
          ["Una pieza, un avatar", "No mezclar comunidad Skool y venta de automatizaciones en el mismo Reel o carrusel."],
          ["Etiquetas editoriales estables", "Usar nombres o senales visuales consistentes para Construye tu proyecto y Haz que tu negocio funcione."],
          ["CTA unico", "Valentina / Juan van a Skool o YouTube; Andres / Laura van a WhatsApp."],
          ["Prueba social pertinente", "Mostrar miembros y procesos para comunidad; mostrar sistemas, resultados y casos para soluciones."],
          ["Historias segmentadas", "Organizar destacados por Comunidad, Metodologias, Casos, Soluciones y Diagnostico."],
          ["No sobrecargar", "Evitar publicar herramientas sin problema, tutoriales largos, multiples ofertas o mensajes dirigidos a todos."],
        ],
      },
      {
        kind: "columns",
        label: "Formatos por objetivo",
        columns: [
          {
            items: [
              "Reels para descubrimiento y demostracion.",
              "Carruseles para metodologia, pasos, errores y comparacion.",
              "Historias para conversacion, agenda, preguntas, testimonios y seguimiento.",
            ],
          },
          {
            items: [
              "Destacados como rutas permanentes de navegacion.",
              "Mensajes directos para Valentina / Juan; enlace o boton de WhatsApp para Andres / Laura.",
            ],
          },
        ],
      },
    ],
  },
  {
    number: "04",
    name: "YouTube Shorts",
    slug: "youtube",
    color: "FF0000",
    tagline: "Extension de descubrimiento para soluciones de pequenos negocios.",
    blocks: [
      {
        kind: "prose",
        label: "Funcion del formato",
        body: "YouTube Shorts es la red secundaria de Andres / Laura. Permite que una persona con poco tiempo reconozca rapidamente un problema, vea una posibilidad de solucion y encuentre a Divergente. No requiere un calendario independiente: los mejores Reels de soluciones se adaptan a Shorts.",
      },
      {
        kind: "bullets",
        label: "Avatar y conversion",
        items: [
          "Prioridad: Andres / Laura · Emprendedor operador.",
          "Oferta: soluciones digitales, sistemas de ventas y automatizaciones.",
          "Conversion: WhatsApp, diagnostico o caso completo.",
          "Apoyo: puede llevar a un video largo cuando exista un caso sectorial completo.",
        ],
      },
      {
        kind: "columns",
        label: "Ganchos y temas",
        columns: [
          {
            items: [
              "Tres tareas que una empresa pequena puede automatizar.",
              "Cuantos clientes pierdes por no responder a tiempo.",
              "Esto puede organizar las reservas de un estudio de yoga.",
              "Una tienda de discos puede utilizar IA de esta manera.",
              "No necesitas un software empresarial para comenzar.",
              "Esta tarea no deberia seguir dependiendo del dueno.",
              "Como saber que automatizar primero.",
            ],
          },
          {
            items: [
              "Un agente de WhatsApp no debe reemplazar a las personas.",
              "Antes de contratar a alguien, revisa estas tareas.",
              "Asi se hace seguimiento a una cotizacion.",
              "Una automatizacion sencilla para restaurantes.",
              "El error de guardar todos los clientes solamente en WhatsApp.",
              "Como hacer que tu negocio funcione cuando no estas.",
              "No automatices un proceso que todavia esta desordenado.",
            ],
          },
        ],
      },
      {
        kind: "definitions",
        label: "Decisiones para Shorts",
        items: [
          { term: "Estructura", desc: "Problema reconocible → consecuencia → solucion posible → llamada a diagnostico." },
          { term: "Produccion", desc: "Adaptar Reels; cambiar texto, encuadre o cierre cuando la plataforma lo necesite." },
          { term: "Tono", desc: "Directo, comprensible, concreto y respetuoso con el conocimiento del dueno del negocio." },
          { term: "Demostracion", desc: "Pantallas, procesos, ejemplos sectoriales, antes/despues y una sola idea por pieza." },
          { term: "CTA", desc: "WhatsApp o video completo; no dirigir simultaneamente a curso, comunidad y servicio." },
          { term: "Evitar", desc: "Consejos genericos para emprendedores, exceso de tecnicismos y videos de herramientas sin resultado empresarial." },
        ],
      },
      {
        kind: "prose",
        label: "Papel del YouTube largo para este avatar",
        body: "No es una linea editorial extensa. Funciona como biblioteca de casos completos: tienda de discos, estudio de yoga, restaurante, sistema de reservas, agente de WhatsApp o seguimiento de clientes. Shorts descubre; el caso largo valida; WhatsApp convierte.",
      },
    ],
  },
];

// ---------- Sistema de produccion y gobernanza ----------

export const PRODUCTION_SYSTEM: {
  number: string;
  title: string;
  tagline: string;
  blocks: ChannelBlock[];
} = {
  number: "05",
  title: "Sistema de produccion y gobernanza",
  tagline: "Como convertir la caracterizacion en una operacion editorial concentrada.",
  blocks: [
    {
      kind: "table",
      label: "Produccion por red",
      headers: ["Red", "Contenido original", "Adaptaciones", "Conversion"],
      rows: [
        [
          "YouTube",
          "Videos largos para Mateo / Mariana; profundidad para Valentina / Juan; casos ejecutivos y sectoriales.",
          "Fragmentos a LinkedIn o Instagram; casos a Shorts cuando aplique.",
          "Bootcamp, Skool, caso B2B o WhatsApp segun avatar.",
        ],
        [
          "LinkedIn",
          "Opinion, casos, marcos de decision y liderazgo para Jaime / Diana.",
          "Ideas y fragmentos de YouTube adaptados para Mateo / Mariana.",
          "CRM, correo y reunion.",
        ],
        [
          "Instagram",
          "Dos rutas: comunidad/proyectos y soluciones para pequenos negocios.",
          "Profundizaciones hacia YouTube; Reels de soluciones hacia Shorts.",
          "Skool/DM o WhatsApp.",
        ],
        [
          "YouTube Shorts",
          "No crea una estrategia independiente.",
          "Adaptacion de Reels de Andres / Laura.",
          "WhatsApp o caso largo.",
        ],
      ],
    },
    {
      kind: "steps",
      label: "Flujo de produccion",
      items: [
        "Seleccionar el avatar: Mateo/Mariana, Jaime/Diana, Valentina/Juan o Andres/Laura.",
        "Definir un problema o deseo concreto del avatar.",
        "Elegir la red principal donde ese mensaje debe nacer.",
        "Formular una promesa clara y un formato nativo de la red.",
        "Definir una sola llamada a la accion y el canal de conversion.",
        "Decidir que adaptacion puede vivir en la red secundaria.",
        "Medir si la pieza atrajo la audiencia y la accion esperadas.",
        "Registrar aprendizajes para ajustar pilares, lenguaje y ofertas.",
      ],
    },
    {
      kind: "table",
      label: "Senales de validacion",
      headers: ["Red", "Senales principales de validacion"],
      rows: [
        ["YouTube", "CTR, retencion, tiempo de reproduccion, retorno de audiencia, suscripciones, clics y conversiones por avatar."],
        ["LinkedIn", "Comentarios cualificados, guardados, visitas al perfil, clics, contactos, reuniones y calidad de los leads."],
        ["Instagram", "Guardados, compartidos, respuestas a historias, mensajes, visitas al perfil, clics a Skool o WhatsApp y conversaciones iniciadas."],
        ["YouTube Shorts", "Retencion inicial, repeticiones, comentarios, visitas al canal, clics al caso o conversaciones por WhatsApp."],
      ],
    },
    {
      kind: "checklist",
      label: "Lista de calidad por pieza",
      items: [
        "A cual avatar le habla esta pieza.",
        "Esta publicada en su red principal o es una adaptacion consciente.",
        "El problema puede reconocerse en los primeros segundos o lineas.",
        "La promesa corresponde a la oferta prioritaria del avatar.",
        "El formato es natural para la red.",
        "Existe una unica llamada a la accion.",
        "La pieza ayuda a aprender, decidir, identificarse o contratar.",
        "Que hipotesis concreta permitira validar.",
      ],
    },
    {
      kind: "prose",
      label: "Sintesis estrategica",
      body: "YouTube construye profundidad y autoridad. LinkedIn convierte experiencia en decisiones empresariales. Instagram construye relacion, comunidad y demostracion visual. YouTube Shorts extiende las soluciones de pequenos negocios sin crear una cuarta operacion editorial. El sistema completo permite que Divergente publique con intencion: cada red tiene una funcion, cada avatar reconoce un relato y cada pieza conduce a una oferta especifica.",
    },
  ],
};
