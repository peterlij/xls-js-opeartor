function initControlListeners() {
  if (window.File && window.FileList && window.FileReader) {
    Init();
  }
}

function Init() {
  var filedrag = $id("filedrag");
  filedrag.addEventListener("dragover", FileDragHover, false);
  filedrag.addEventListener("dragleave", FileDragHover, false);
  filedrag.addEventListener("drop", FileSelectHandler, false);
  filedrag.style.display= "block";
  
  var lclFiledrag = $id("lclFiledrag");
  lclFiledrag.addEventListener("dragover", FileDragHover, false);
  lclFiledrag.addEventListener("dragleave", FileDragHover, false);
  lclFiledrag.addEventListener("drop", LCLFileSelectHandler, false);
  lclFiledrag.style.display= "block";
}

// file drag hover
function FileDragHover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.target.className = (e.type == "dragover" ? "hover" : "");
}

// file selection
function FileSelectHandler(e) {
  // cancel event and hover styling
  FileDragHover(e);
  handleDrop(e);
}

var rABS = true; // true: readAsBinaryString ; false: readAsArrayBuffer
function handleDrop(e) {
  e.stopPropagation(); e.preventDefault();
  var files = e.dataTransfer.files, f = files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = e.target.result;
    if(!rABS) data = new Uint8Array(data);
    var workbook = XLSX.read(data, {type: rABS ? 'binary' : 'array'});
    readFromXsl(workbook);
    /* DO SOMETHING WITH workbook HERE */
  };
  if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
}

function readFromXsl(workbook) {
  var worksheet = workbook.Sheets[workbook.SheetNames[1]];
  var data = XLSX.utils.sheet_to_json(worksheet, {range:4, header:[
    'lot', 'carrier', 'role', 'efcFrom', 'efcTo', 'bp',	'bu', 'oCity', 'loadPort', 'oCountry',
    'dischargePort', 'dCity', 'dCountry', 'shipmentType', 'serviceMode', 'incoTerm',	'containerSize',
    'oCurrency', 'ecc', 'ohc', 'oThc', 'otZone1', 'otZone2', 'ot', 
    'freignt', 'vgm',	
    'dCurrency', 'icc', 'dhc',	'dThc',	'dtZone1', 'dtZone2',	'dt'
  ]});
  
  var fdata = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    fdata[i] = {lane:{}, orig:{}, ocean:{}, dest:{}};
    fillLane(fdata[i], d);
    fillOrig(fdata[i], d);
    fillOcean(fdata[i], d);
    fillDest(fdata[i], d);
  }
  
  document.writeln(JSON.stringify(fdata));
}

function fillLane(fdata, d) {
  fdata.lane.oc = tostr(d.oCity);
  fdata.lane.loadPort = tostr(d.loadPort); 
  fdata.lane.dc = tostr(d.dCity); 
  fdata.lane.dischargePort = tostr(d.dischargePort); 
  fdata.lane.contType = tostr(d.containerSize); 
}

function fillOrig(fdata, d) {
  fdata.orig.ecc = tonum(d.ecc);
  fdata.orig.hc = tonum(d.ohc);
  fdata.orig.thc = tonum(d.oThc);
  fdata.orig.tZone1 = tonum(d.otZone1);
  fdata.orig.tZone2 = tonum(d.otZone2);
  fdata.orig.t = tonum(d.ot);
  fdata.orig.currency = tostr(d.oCurrency);
}

function fillOcean(fdata, d) {
  fdata.ocean.freignt = tonum(d.freignt);
  fdata.ocean.vgm = tonum(d.vgm);
  fdata.ocean.currency = 'usd';
}

function fillDest(fdata, d) {
  fdata.dest.icc = tonum(d.icc);
  fdata.dest.hc = tonum(d.dhc);
  fdata.dest.thc = tonum(d.dThc);
  fdata.dest.tZone1 = tonum(d.dtZone1);
  fdata.dest.tZone2 = tonum(d.dtZone2);
  fdata.dest.t = tonum(d.dt);
  fdata.dest.currency = tostr(d.dCurrency);
}


// file selection
function LCLFileSelectHandler(e) {
  // cancel event and hover styling
  FileDragHover(e);
  lclHandleDrop(e);
}

function lclHandleDrop(e) {
  e.stopPropagation(); e.preventDefault();
  var files = e.dataTransfer.files, f = files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    var data = e.target.result;
    if(!rABS) data = new Uint8Array(data);
    var workbook = XLSX.read(data, {type: rABS ? 'binary' : 'array'});
    lclReadFromXsl(workbook);
    /* DO SOMETHING WITH workbook HERE */
  };
  if(rABS) reader.readAsBinaryString(f); else reader.readAsArrayBuffer(f);
}

function lclReadFromXsl(workbook) {
  var worksheet = workbook.Sheets[workbook.SheetNames[2]];
  var data = XLSX.utils.sheet_to_json(worksheet, {range:4, header:[
    'lot', 'carrier', 'role', 'efcFrom', 'efcTo', 'bp',	'bu', 'oCity', 'loadPort', 'oCountry',
    'dischargePort', 'dCity', 'dCountry', 'shipmentType', 'serviceMode', 'incoTerm',
    'oCurrency', 'ecc', 'oStandard1', 'oStandard2', 'minOStandard2', 'otZone1', 'minOtZone1', 'otZone2', 'minOtZone2', 'ot', 'minOt',
    'freignt', 'minFreignt', 'vgm',	
    'dCurrency', 'icc', 'dStandard1', 'dStandard2', 'minDStandard2', 'dtZone1', 'minDtZone1', 'dtZone2', 'minDtZone2', 'dt', 'minDt'
  ]});
  
  var fdata = [];
  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    fdata[i] = {lane:{}, orig:{}, ocean:{}, dest:{}};
    fillLCLLane(fdata[i], d);
    fillLCLOrig(fdata[i], d);
    fillLCLOcean(fdata[i], d);
    fillLCLDest(fdata[i], d);
  }
  
  document.writeln(JSON.stringify(fdata));
}

function fillLCLLane(fdata, d) {
  fdata.lane.oc = tostr(d.oCity);
  fdata.lane.loadPort = tostr(d.loadPort); 
  fdata.lane.dc = tostr(d.dCity); 
  fdata.lane.dischargePort = tostr(d.dischargePort);  
}

function fillLCLOrig(fdata, d) {
  fdata.orig.ecc = tonum(d.ecc);
  fdata.orig.standard1 = tonum(d.oStandard1);
  fdata.orig.standard2 = tonum(d.oStandard2);
  fdata.orig.minStandard2 = tonum(d.minOStandard2);
  fdata.orig.tZone1 = tonum(d.otZone1);
  fdata.orig.mintZone1 = tonum(d.minOtZone1);
  fdata.orig.tZone2 = tonum(d.otZone2);
  fdata.orig.mintZone2 = tonum(d.minOtZone2);
  fdata.orig.t = tonum(d.ot);
  fdata.orig.mint = tonum(d.minOt);
  fdata.orig.currency = tostr(d.oCurrency);
}

function fillLCLOcean(fdata, d) {
  fdata.ocean.freignt = tonum(d.freignt);
  fdata.ocean.minFreignt = tonum(d.minFreignt);
  fdata.ocean.vgm = tonum(d.vgm);
  fdata.ocean.currency = 'usd';
}

function fillLCLDest(fdata, d) {
  fdata.dest.icc = tonum(d.icc);
  fdata.dest.standard1 = tonum(d.dStandard1);
  fdata.dest.standard2 = tonum(d.dStandard2);
  fdata.dest.minStandard2 = tonum(d.minDStandard2);
  fdata.dest.tZone1 = tonum(d.dtZone1);
  fdata.dest.mintZone1 = tonum(d.minDtZone1);
  fdata.dest.tZone2 = tonum(d.dtZone2);
  fdata.dest.mintZone2 = tonum(d.minDtZone2);
  fdata.dest.t = tonum(d.dt);
  fdata.dest.mint = tonum(d.minDt);
  fdata.dest.currency = tostr(d.dCurrency);
}