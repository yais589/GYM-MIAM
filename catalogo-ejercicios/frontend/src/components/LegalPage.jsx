import '../styles/LegalPage.css'

const content = {
  privacy: {
    title: 'Política de Privacidad',
    sections: [
      ['Responsable del tratamiento', 'TitanGym es responsable del tratamiento de los datos personales facilitados por los usuarios mediante esta web.'],
      ['Información recopilada', 'Podemos recopilar nombre, correo electrónico, ciudad, edad, objetivo deportivo y otra información que el usuario facilite voluntariamente.'],
      ['Finalidad', 'Usamos los datos para gestionar el acceso, guardar el perfil deportivo y mejorar la experiencia del catálogo.'],
      ['Conservación', 'Los datos se conservan durante el tiempo necesario para prestar el servicio o mientras exista una obligación legal.'],
      ['Derechos', 'Puedes solicitar acceso, rectificación, supresión, limitación u oposición al tratamiento de tus datos.'],
      ['Seguridad', 'Aplicamos medidas técnicas para proteger la información personal frente a accesos no autorizados.'],
      ['Contacto', 'Para cualquier consulta sobre privacidad, escribe a info@titangym.com.']
    ]
  },
  cookies: {
    title: 'Política de Cookies',
    sections: [
      ['Qué son las cookies', 'Las cookies son pequeños archivos que se guardan en tu dispositivo para recordar preferencias y mejorar la navegación.'],
      ['Cookies que usamos', 'TitanGym usa almacenamiento local para recordar tu decisión sobre cookies y mantener preferencias básicas de la aplicación.'],
      ['Tu elección', 'Puedes aceptar o rechazar las cookies desde el aviso que aparece al entrar. Borrar los datos del navegador permite elegir de nuevo.'],
      ['Contacto', 'Si tienes dudas sobre el uso de cookies, escribe a info@titangym.com.']
    ]
  },
  legal: {
    title: 'Aviso Legal',
    sections: [
      ['Información general', 'Este sitio web pertenece a TitanGym y ofrece información sobre ejercicios, actividades deportivas y funcionamiento del gimnasio.'],
      ['Condiciones de uso', 'El acceso y la navegación por esta web implican la aceptación de estas condiciones de uso.'],
      ['Propiedad intelectual', 'Los textos, imágenes, logotipos, diseños y elementos gráficos pertenecen a TitanGym o se utilizan con autorización.'],
      ['Responsabilidad', 'TitanGym no se responsabiliza de interrupciones del servicio, errores técnicos o daños derivados del uso de la página.'],
      ['Enlaces externos', 'La web puede contener enlaces a sitios de terceros cuyos contenidos y políticas son responsabilidad de sus titulares.'],
      ['Legislación aplicable', 'Este sitio se rige por la legislación española vigente.']
    ]
  }
}

function LegalPage({ type, language }) {
  const page = content[type] || content.legal
  const isSpanish = language === 'es'
  return (
    <main className="legal-page">
      <a className="legal-back" href="/">← {isSpanish ? 'Volver a TitanGYM' : 'Back to TitanGYM'}</a>
      <article className="legal-card">
        <span className="legal-kicker">TITANGYM / {isSpanish ? 'INFORMACIÓN' : 'INFORMATION'}</span>
        <h1>{page.title}</h1>
        {page.sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
      </article>
    </main>
  )
}

export default LegalPage
