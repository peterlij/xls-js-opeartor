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