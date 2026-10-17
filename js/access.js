/* =========================================================
   WORKLOG
   CONTROL DE ACCESO DE USUARIOS
   ========================================================= */

import {
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

import {
  db
} from './firebase.js';


/* =========================================================
   CONSTANTES
   ========================================================= */

const ACCESS_COLLECTION=
  'userAccess';

/*
  Lease de acceso offline.

  El acceso sin conexión solo se permite si hubo una
  verificación ONLINE válida (leída del servidor, no de
  la caché) durante las últimas 24 horas.
*/

const OFFLINE_LEASE_MS=
  24*60*60*1000;

const leaseKey=
  uid=>`worklog_access_lease_${uid}`;

function saveAccessLease(uid){
  try{
    localStorage.setItem(
      leaseKey(uid),
      String(Date.now())
    );
  }catch{}
}

function clearAccessLease(uid){
  try{
    localStorage.removeItem(
      leaseKey(uid)
    );
  }catch{}
}

function hasValidAccessLease(uid){
  try{
    const stamp=
      Number(
        localStorage.getItem(
          leaseKey(uid)
        )
      );

    return (
      Number.isFinite(stamp)&&
      stamp>0&&
      Date.now()-stamp<
        OFFLINE_LEASE_MS&&
      stamp<=Date.now()+60000
    );
  }catch{
    return false;
  }
}


/* =========================================================
   UTILIDADES
   ========================================================= */

function cleanString(
  value,
  maxLength=200
){

  return typeof value==='string'
    ?value.trim().slice(
      0,
      maxLength
    )
    :'';
}


function timestampToDate(
  value
){

  if(!value){
    return null;
  }


  if(
    value instanceof Date
  ){
    return value;
  }


  if(
    typeof value.toDate===
    'function'
  ){

    try{

      return value.toDate();

    }catch{

      return null;
    }
  }


  if(
    typeof value.seconds===
    'number'
  ){

    return new Date(
      value.seconds*1000
    );
  }


  return null;
}


/* =========================================================
   NORMALIZAR DOCUMENTO
   ========================================================= */

function normalizeAccess(
  uid,
  data={}
){

  const active=
    data.active!==false;


  const disabledForever=
    data.disabledForever===true;


  const blockedUntil=
    timestampToDate(
      data.blockedUntil
    );


  let status=
    'active';


  let allowed=
    true;


  const pending=
    !active&&
    !disabledForever&&
    !blockedUntil;


  /*
    Bloqueo indefinido.
  */

  if(
    disabledForever||
    !active
  ){

    status=
      pending
        ?'pending'
        :'blocked';

    allowed=
      false;

  }else if(
    blockedUntil&&
    blockedUntil.getTime()>
      Date.now()
  ){

    /*
      Suspensión temporal.
    */

    status=
      'suspended';

    allowed=
      false;
  }


  return {

    uid,

    email:
      cleanString(
        data.email,
        254
      ),

    displayName:
      cleanString(
        data.displayName,
        80
      ),

    role:
      data.role==='admin'
        ?'admin'
        :'user',

    active,

    disabledForever,

    blockedUntil,

    adminNote:
      cleanString(
        data.adminNote,
        500
      ),

    createdAt:
      timestampToDate(
        data.createdAt
      ),

    updatedAt:
      timestampToDate(
        data.updatedAt
      ),

    status,

    allowed
  };
}


/* =========================================================
   REFERENCIA
   ========================================================= */

function accessRef(
  uid
){

  return doc(
    db,
    ACCESS_COLLECTION,
    uid
  );
}


/* =========================================================
   LEER ACCESO
   ========================================================= */

export async function getUserAccess(
  uid
){

  if(!uid){

    throw new Error(
      'No se recibió el UID del usuario.'
    );
  }


  const snapshot=
    await getDoc(
      accessRef(uid)
    );


  if(
    !snapshot.exists()
  ){

    return null;
  }


  return normalizeAccess(
    uid,
    snapshot.data()
  );
}


/* =========================================================
   CREAR PERFIL INICIAL
   ========================================================= */

async function createInitialAccess(
  user
){

  const email=
    cleanString(
      user?.email,
      254
    );


  const displayName=
    cleanString(
      user?.displayName,
      80
    );


  const data={

    email,

    displayName,

    active:false,

    disabledForever:false,

    role:'user',

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp()
  };


  await setDoc(
    accessRef(
      user.uid
    ),
    data
  );


  /*
    No necesitamos volver a hacer otra lectura
    solamente para devolver los valores que
    acabamos de crear.
  */

  return normalizeAccess(
    user.uid,
    {
      email,
      displayName,
      active:false,
      disabledForever:false,
      role:'user'
    }
  );
}


/* =========================================================
   SINCRONIZAR CORREO / NOMBRE
   ========================================================= */

async function syncBasicProfile(
  user,
  access
){

  if(
    !user||
    !access
  ){
    return;
  }


  const email=
    cleanString(
      user.email,
      254
    );


  const displayName=
    cleanString(
      user.displayName,
      80
    );


  const patch={};


  /*
    Solamente escribimos en Firestore
    cuando realmente existe un cambio.

    Esto evita una escritura en cada login.
  */

  if(
    email&&
    email!==access.email
  ){

    patch.email=
      email;
  }


  if(
    displayName!==
    access.displayName
  ){

    patch.displayName=
      displayName;
  }


  if(
    !Object.keys(patch).length
  ){
    return;
  }


  patch.updatedAt=
    serverTimestamp();


  try{

    await updateDoc(
      accessRef(
        user.uid
      ),
      patch
    );


    if(
      'email' in patch
    ){
      access.email=
        email;
    }


    if(
      'displayName' in patch
    ){
      access.displayName=
        displayName;
    }

  }catch(error){

    /*
      Una falla al actualizar nombre/correo
      no debe impedir que el usuario abra
      WorkLog.

      La seguridad del acceso se verifica
      independientemente.
    */

    console.warn(
      'No se pudo sincronizar el perfil de acceso:',
      error
    );
  }
}


/* =========================================================
   ASEGURAR userAccess/{uid}
   ========================================================= */

export async function ensureUserAccess(
  user
){
  const result=
    await ensureUserAccessInner(
      user
    );

  if(
    result&&
    !result.offline
  ){
    if(result.allowed!==false){
      saveAccessLease(
        user.uid
      );
    }else{
      clearAccessLease(
        user.uid
      );
    }
  }

  return result;
}

async function ensureUserAccessInner(
  user
){

  if(
    !user||
    !user.uid
  ){

    throw new Error(
      'No hay un usuario autenticado.'
    );
  }


  const uid=
    user.uid;


  try{

    const serverSnapshot=
      await Promise.race([
        getDocFromServer(
          accessRef(uid)
        ),
        new Promise((_,reject)=>
          setTimeout(
            ()=>reject(
              Object.assign(
                new Error(
                  'Tiempo de espera agotado al verificar el acceso.'
                ),
                {code:'unavailable'}
              )
            ),
            8000
          )
        )
      ]);

    let access=
      serverSnapshot.exists()
        ?normalizeAccess(
          uid,
          serverSnapshot.data()
        )
        :null;


    /*
      Cuentas antiguas:

      Si existían antes de implementar el
      panel administrativo todavía no tendrán
      userAccess/{uid}.

      Lo creamos automáticamente.
    */

    if(!access){

      access=
        await createInitialAccess(
          user
        );


      return access;
    }


    /*
      Actualizamos únicamente correo/nombre
      cuando cambiaron.
    */

    await syncBasicProfile(
      user,
      access
    );


    /*
      Volvemos a calcular el estado porque
      blockedUntil depende de la hora actual.
    */

    return normalizeAccess(
      uid,
      {
        email:
          access.email,

        displayName:
          access.displayName,

        role:
          access.role,

        active:
          access.active,

        disabledForever:
          access.disabledForever,

        blockedUntil:
          access.blockedUntil,

        adminNote:
          access.adminNote,

        createdAt:
          access.createdAt,

        updatedAt:
          access.updatedAt
      }
    );

  }catch(error){

    /*
      Si Firestore está completamente fuera
      de línea y no existe todavía una copia
      local del documento, no queremos romper
      el funcionamiento local-first.

      IMPORTANTE:
      esto NO permite saltarse las reglas de
      Firestore. Cualquier escritura o lectura
      protegida sigue siendo validada por las
      Security Rules cuando Firebase se conecta.
    */

    if(
      error?.code===
        'unavailable'||

      error?.code===
        'firestore/unavailable'||

      (
        !navigator.onLine&&
        error?.code!==
          'permission-denied'&&
        error?.code!==
          'firestore/permission-denied'
      )
    ){

      console.warn(
        'No se pudo comprobar userAccess porque el dispositivo está sin conexión:',
        error
      );


      const leaseOk=
        hasValidAccessLease(
          uid
        );

      return {

        uid,

        email:
          cleanString(
            user.email,
            254
          ),

        displayName:
          cleanString(
            user.displayName,
            80
          ),

        role:'user',

        active:leaseOk,

        disabledForever:false,

        blockedUntil:null,

        adminNote:'',

        createdAt:null,

        updatedAt:null,

        status:
          leaseOk
            ?'offline'
            :'offline-expired',

        allowed:leaseOk,

        offline:true
      };
    }


    throw error;
  }
}


/* =========================================================
   ELIMINAR PERFIL DE ACCESO PROPIO
   ========================================================= */

/*
  Esta función se utiliza solamente durante
  la eliminación voluntaria de la cuenta.

  Primero app.js elimina los datos privados
  del usuario.

  Después elimina:

  userAccess/{uid}

  y finalmente elimina la cuenta de
  Firebase Authentication.

  Las Security Rules impedirán ejecutar
  esta operación si la cuenta está
  suspendida o bloqueada.
*/

export async function deleteOwnUserAccess(
  uid
){

  if(!uid){

    throw new Error(
      'No se recibió el UID del usuario.'
    );
  }


  await deleteDoc(
    accessRef(
      uid
    )
  );


  return true;
}


/* =========================================================
   COMPROBAR ESTADO
   ========================================================= */

export function isAccessAllowed(
  access
){

  return (
    !access||
    access.allowed!==false
  );
}


/* =========================================================
   TEXTO DEL BLOQUEO
   ========================================================= */

export function accessMessage(
  access
){

  if(
    !access||
    access.allowed!==false
  ){

    return '';
  }


  if(
    access.status===
    'pending'
  ){

    return (
      'Tu cuenta fue creada y está pendiente de aprobación. '+
      'El administrador debe activarla antes de que puedas entrar.'
    );
  }


  if(
    access.status===
    'offline-expired'
  ){

    return (
      'Necesitas conexión a Internet para verificar tu acceso. '+
      'El acceso sin conexión expira 24 horas después de la última verificación.'
    );
  }


  if(
    access.status===
    'blocked'
  ){

    return (
      'Tu cuenta está bloqueada. '+
      'Contacta al administrador de WorkLog.'
    );
  }


  if(
    access.status===
      'suspended'
  ){

    if(
      access.blockedUntil
    ){

      let formattedDate='';


      try{

        formattedDate=
          new Intl.DateTimeFormat(
            'es-EC',
            {
              dateStyle:'medium',
              timeStyle:'short'
            }
          ).format(
            access.blockedUntil
          );

      }catch{

        formattedDate=
          access.blockedUntil
            .toLocaleString();
      }


      return (
        'Tu cuenta está suspendida hasta '+
        formattedDate+
        '.'
      );
    }


    return (
      'Tu cuenta está suspendida temporalmente.'
    );
  }


  return (
    'Tu cuenta no tiene acceso a WorkLog.'
  );
}