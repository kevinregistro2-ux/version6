/* =========================================================
   WORKLOG
   EXPORTACIÓN EXCEL .XLSX SIN DEPENDENCIAS EXTERNAS
   ========================================================= */

const encoder=new TextEncoder();

function cleanFileName(value='worklog.xlsx'){
  let name=String(value||'worklog.xlsx')
    .trim()
    .replace(/[\\/:*?"<>|]+/g,'-')
    .replace(/\s+/g,' ')
    .slice(0,140);

  if(!name.toLowerCase().endsWith('.xlsx')){
    name+='.xlsx';
  }

  return name||'worklog.xlsx';
}

function xmlEscape(value=''){
  return String(value??'')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&apos;');
}

function sanitizeSheetName(value='Hoja'){
  const text=String(value||'Hoja')
    .replace(/[\\/*?:\[\]]/g,' ')
    .trim()
    .slice(0,31);

  return text||'Hoja';
}

function columnName(index){
  let value=Number(index)+1;
  let result='';

  while(value>0){
    const mod=(value-1)%26;
    result=String.fromCharCode(65+mod)+result;
    value=Math.floor((value-1)/26);
  }

  return result;
}

function stringCell(ref,value,style=0){
  return `<c r="${ref}" t="inlineStr"${style?` s="${style}"`:''}><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function numberCell(ref,value,style=0){
  const number=Number(value);
  const safe=Number.isFinite(number)?number:0;
  return `<c r="${ref}"${style?` s="${style}"`:''}><v>${safe}</v></c>`;
}

function booleanCell(ref,value,style=0){
  return `<c r="${ref}" t="b"${style?` s="${style}"`:''}><v>${value?1:0}</v></c>`;
}

function normalizeRows(headers,rows){
  return [
    headers,
    ...rows.map(row=>headers.map(header=>row[header.key]))
  ];
}

function estimateWidths(headers,rows){
  return headers.map((header,index)=>{
    let max=String(header.label).length;

    for(const row of rows){
      let value=row[header.key];

      if(Array.isArray(value)){
        value=value.join(', ');
      }

      max=Math.max(
        max,
        String(value??'').length
      );
    }

    const preferred=header.width||0;
    return Math.min(
      48,
      Math.max(
        preferred,
        Math.min(34,max+2),
        10
      )
    );
  });
}

function makeWorksheet({
  headers,
  rows,
  freeze=true,
  autoFilter=true
}){
  const all=normalizeRows(headers,rows);
  const widths=estimateWidths(headers,rows);
  const lastColumn=columnName(headers.length-1);
  const lastRow=Math.max(1,all.length);

  const cols=widths
    .map((width,index)=>
      `<col min="${index+1}" max="${index+1}" width="${width}" customWidth="1"/>`
    )
    .join('');

  const rowXml=all.map((values,rowIndex)=>{
    const rowNumber=rowIndex+1;

    const cells=values.map((raw,colIndex)=>{
      const ref=`${columnName(colIndex)}${rowNumber}`;
      const header=headers[colIndex];

      if(rowIndex===0){
        return stringCell(ref,header.label,1);
      }

      if(header.type==='number'||typeof raw==='number'){
        const isCurrency=
          header.format==='currency'||
          Boolean(rows[rowIndex-1]?.__currency);
        return numberCell(
          ref,
          raw,
          isCurrency?2:0
        );
      }

      if(header.type==='boolean'){
        return booleanCell(ref,Boolean(raw));
      }

      if(Array.isArray(raw)){
        return stringCell(ref,raw.join(', '));
      }

      return stringCell(ref,raw??'');
    }).join('');

    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');

  const pane=freeze
    ?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    :'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const filter=autoFilter&&headers.length
    ?`<autoFilter ref="A1:${lastColumn}${lastRow}"/>`
    :'';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  ${pane}
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
  ${filter}
</worksheet>`;
}

function summarizeBy(items,key){
  const map=new Map();

  for(const item of items){
    const name=String(item?.[key]||'Sin dato').trim()||'Sin dato';
    const current=map.get(name)||{
      name,
      count:0,
      value:0
    };

    current.count+=1;
    current.value+=Number(item?.value)||0;
    map.set(name,current);
  }

  return [...map.values()]
    .sort((a,b)=>
      b.count-a.count||
      b.value-a.value||
      a.name.localeCompare(b.name,'es')
    );
}

function makeSheets({period,activities,places,summary}){
  const activityHeaders=[
    {key:'date',label:'Fecha',width:13},
    {key:'time',label:'Hora',width:9},
    {key:'place',label:'Lugar',width:22},
    {key:'address',label:'Dirección',width:28},
    {key:'activity',label:'Actividad',width:22},
    {key:'note',label:'Nota',width:30},
    {key:'tags',label:'Etiquetas',width:22},
    {key:'value',label:'Valor',width:12,type:'number',format:'currency'},
    {key:'status',label:'Estado',width:14},
    {key:'priority',label:'Prioridad',width:12},
    {key:'dueDate',label:'Pendiente hasta',width:16}
  ];

  const placeHeaders=[
    {key:'name',label:'Lugar',width:24},
    {key:'address',label:'Dirección',width:30},
    {key:'category',label:'Categoría',width:18},
    {key:'reference',label:'Referencia',width:24},
    {key:'favorite',label:'Favorito',width:12,type:'boolean'},
    {key:'archived',label:'Archivado',width:12,type:'boolean'}
  ];

  const summaryRows=[
    {metric:'Periodo',value:String(period||'—')},
    {metric:'Registros',value:Number(summary?.records)||0},
    {metric:'Valor total',value:Number(summary?.totalValue)||0,currency:true},
    {metric:'Lugares únicos',value:Number(summary?.uniquePlaces)||0},
    {metric:'Realizadas',value:Number(summary?.completed)||0},
    {metric:'Pendientes',value:Number(summary?.pending)||0},
    {metric:'Canceladas',value:Number(summary?.cancelled)||0},
    {metric:'Días activos',value:Number(summary?.activeDays)||0}
  ];

  const summaryHeaders=[
    {key:'metric',label:'Indicador',width:24},
    {key:'value',label:'Valor',width:18}
  ];

  const summaryXml=makeWorksheet({
    headers:summaryHeaders,
    rows:summaryRows.map(row=>({
      metric:row.metric,
      value:row.currency
        ?Number(Number(row.value).toFixed(2))
        :row.value,
      __currency:Boolean(row.currency)
    })),
    autoFilter:false
  });

  const byPlace=summarizeBy(activities,'place');
  const byActivity=summarizeBy(activities,'activity');

  const aggregateHeaders=[
    {key:'name',label:'Nombre',width:26},
    {key:'count',label:'Registros',width:12,type:'number'},
    {key:'value',label:'Valor total',width:14,type:'number',format:'currency'}
  ];

  return [
    {
      name:'Actividades',
      xml:makeWorksheet({
        headers:activityHeaders,
        rows:activities
      })
    },
    {
      name:'Lugares',
      xml:makeWorksheet({
        headers:placeHeaders,
        rows:places
      })
    },
    {
      name:'Resumen',
      xml:summaryXml
    },
    {
      name:'Por lugar',
      xml:makeWorksheet({
        headers:aggregateHeaders,
        rows:byPlace
      })
    },
    {
      name:'Por actividad',
      xml:makeWorksheet({
        headers:aggregateHeaders,
        rows:byActivity
      })
    }
  ];
}

function stylesXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="$#,##0.00"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF635BFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function workbookXml(sheets){
  const content=sheets.map((sheet,index)=>
    `<sheet name="${xmlEscape(sanitizeSheetName(sheet.name))}" sheetId="${index+1}" r:id="rId${index+1}"/>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${content}</sheets>
</workbook>`;
}

function workbookRelsXml(sheets){
  const sheetRels=sheets.map((_,index)=>
    `<Relationship Id="rId${index+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index+1}.xml"/>`
  ).join('');

  const styleId=sheets.length+1;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${styleId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets){
  const overrides=sheets.map((_,index)=>
    `<Override PartName="/xl/worksheets/sheet${index+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
}

function rootRelsXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function crc32(bytes){
  let crc=0xFFFFFFFF;

  for(const byte of bytes){
    crc^=byte;

    for(let i=0;i<8;i++){
      crc=(crc>>>1)^(
        (crc&1)
          ?0xEDB88320
          :0
      );
    }
  }

  return (crc^0xFFFFFFFF)>>>0;
}

function uint16(value){
  const out=new Uint8Array(2);
  new DataView(out.buffer).setUint16(0,value,true);
  return out;
}

function uint32(value){
  const out=new Uint8Array(4);
  new DataView(out.buffer).setUint32(0,value>>>0,true);
  return out;
}

function concatBytes(parts){
  const total=parts.reduce((sum,part)=>sum+part.length,0);
  const out=new Uint8Array(total);
  let offset=0;

  for(const part of parts){
    out.set(part,offset);
    offset+=part.length;
  }

  return out;
}

function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2);
  const dosDate=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,date:dosDate};
}

function createZip(files){
  const locals=[];
  const centrals=[];
  let offset=0;
  const now=dosDateTime();

  for(const file of files){
    const nameBytes=encoder.encode(file.name);
    const data=typeof file.data==='string'
      ?encoder.encode(file.data)
      :file.data;
    const crc=crc32(data);

    const local=concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(now.time),
      uint16(now.date),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
      data
    ]);

    locals.push(local);

    const central=concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(now.time),
      uint16(now.date),
      uint32(crc),
      uint32(data.length),
      uint32(data.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes
    ]);

    centrals.push(central);
    offset+=local.length;
  }

  const centralSize=centrals.reduce((sum,part)=>sum+part.length,0);
  const centralOffset=offset;

  const end=concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralSize),
    uint32(centralOffset),
    uint16(0)
  ]);

  return concatBytes([
    ...locals,
    ...centrals,
    end
  ]);
}

function downloadXlsx(bytes,filename){
  const blob=new Blob(
    [bytes],
    {
      type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  );

  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=cleanFileName(filename);
  anchor.style.display='none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(
    ()=>URL.revokeObjectURL(url),
    1500
  );
}

export async function exportWorkLogExcel({
  filename='worklog.xlsx',
  period='',
  activities=[],
  places=[],
  summary={}
}={}){
  const safeActivities=Array.isArray(activities)?activities:[];
  const safePlaces=Array.isArray(places)?places:[];

  if(!safeActivities.length){
    throw new Error('No hay actividades para exportar a Excel.');
  }

  const sheets=makeSheets({
    period,
    activities:safeActivities,
    places:safePlaces,
    summary
  });

  const files=[
    {
      name:'[Content_Types].xml',
      data:contentTypesXml(sheets)
    },
    {
      name:'_rels/.rels',
      data:rootRelsXml()
    },
    {
      name:'xl/workbook.xml',
      data:workbookXml(sheets)
    },
    {
      name:'xl/_rels/workbook.xml.rels',
      data:workbookRelsXml(sheets)
    },
    {
      name:'xl/styles.xml',
      data:stylesXml()
    },
    ...sheets.map((sheet,index)=>({
      name:`xl/worksheets/sheet${index+1}.xml`,
      data:sheet.xml
    }))
  ];

  const bytes=createZip(files);
  downloadXlsx(bytes,filename);

  return true;
}
