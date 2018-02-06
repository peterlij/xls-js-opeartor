var CURRENCY = {};

function initControlListeners() {
  $('#form').validator({
      custom: {
        equals: function($el) {
          var matchValue = $el.data("equals") // foo
          if ($el.val() !== matchValue) {
            return "Hey, that's not valid! It's gotta be " + matchValue
          }
        }
      }
  });
  
  $('#portOfLoading').blur(getCurrencyUpdater('orig', 'portOfLoading', 'oCurrLabel', 'oCurrValue'));
  $('#portOfDischarge').blur(getCurrencyUpdater('dest', 'portOfDischarge', 'dCurrLabel', 'dCurrValue'));
  
  $('#portOfLoading').keyup(getCurrencyUpdater('orig', 'portOfLoading', 'oCurrLabel', 'oCurrValue'));
  $('#portOfDischarge').keyup(getCurrencyUpdater('dest', 'portOfDischarge', 'dCurrLabel', 'dCurrValue'));
  
  $('#fcl').change(changeCL);
  $('#lcl').change(changeCL);
  
  changeCL();
}

function changeCL() {
  var fclSelected = $('#fcl').get(0).checked;
  enableDiableCLControls(fclSelected);
}

function enableDiableCLControls(fclSelected) {
  if (fclSelected) {
    $('#numOf20GP').attr("disabled",false);
    $('#numOf40GP').attr("disabled",false); 
    $('#numOf40HQ').attr("disabled",false); 
    
    $('#grossWeight').attr("disabled",true); 
    $('#volume').attr("disabled",true);
    $('#grossWeight').val(0); 
    $('#volume').val(0);  
  } else {
    $('#numOf20GP').attr("disabled",true);
    $('#numOf40GP').attr("disabled",true); 
    $('#numOf40HQ').attr("disabled",true); 
    $('#numOf20GP').val(0);
    $('#numOf40GP').val(0);
    $('#numOf40HQ').val(0);
    
    $('#grossWeight').attr("disabled",false); 
    $('#volume').attr("disabled",false); 
  }
  $("#result")[0].innerHTML = "";
}

function getCurrencyUpdater(portCategory, portId, currencyLabelId, currencyValueId) {
  return function() {
    var port = $('#' + portId).val();
    var formatedPort = tostr(port);
    laneInfo = null;
    var portAttr = (portCategory == 'orig' ? 'loadPort' : 'dischargePort');
    
    var fclSelected = $('#fcl').get(0).checked;
    var lanes = fclSelected ? FCL_LANES : LCL_LANES;
    for (var i = 0; i < lanes.length; i++) {
      if (formatedPort == lanes[i].lane[portAttr]) {
        laneInfo = lanes[i];
        break;
      }
    }
    
    if (laneInfo == null) {
      $('#' + currencyLabelId).html('? ');
      $('#' + currencyValueId).val('');
      return;
    }
     
    var currUpper = laneInfo[portCategory].currency.toUpperCase();
    if (CURRENCY[currUpper]) {
       fx.base = currUpper;
       fx.rates = CURRENCY[currUpper];
       updateCurrency(currUpper);
         
       $('#' + currencyLabelId).html('1 ' + currUpper + ' is ');
       $('#' + currencyValueId).val(fx(1).from(fx.base).to("USD"));
    } else {
      $.get('https://api.fixer.io/latest?base=' + currUpper)
       .done(function(data) {
         fx.base = currUpper;
         fx.rates = data.rates;
         CURRENCY[fx.base] = fx.rates;
         updateCurrency(currUpper);
       });
    }
  };
  
  function updateCurrency(currUpper) {
    $('#' + currencyLabelId).html('1 ' + currUpper + ' is ');
    $('#' + currencyValueId).val(fx(1).from(fx.base).to("USD"));
  }
}

function handleSubmit() {
  $('#form').validator().on('submit', function (e) {
    if (!e.isDefaultPrevented()) {
      e.preventDefault();
      calculate();
    }
    return false;
  });
}


var loadPort = null;
var dischargePort = null;
var formatedLoadPort = null;
var formatedDischargePort = null;

var num20Gp = null;
var num40Gp = null;
var num40Hq = null;
var origCurrency = null;
var destCurrency = null;

var grossWeight = null;
var volume = null;

function calculate() {  
  loadPort = $('#portOfLoading').val();
  dischargePort = $('#portOfDischarge').val();
  
  formatedLoadPort = tostr(loadPort);
  formatedDischargePort = tostr(dischargePort);
  
  num20Gp = $('#numOf20GP').val();
  num20Gp = (num20Gp == '' ? 0 : parseInt(num20Gp));
  num40Gp = $('#numOf40GP').val();
  num40Gp = (num40Gp == '' ? 0 : parseInt(num40Gp));
  num40Hq = $('#numOf40HQ').val();
  num40Hq = (num40Hq == '' ? 0 : parseInt(num40Hq));
  
  grossWeight = $('#grossWeight').val();
  grossWeight = (grossWeight == '' ? 0 : parseFloat(grossWeight));
  volume = $('#volume').val();
  volume = (volume == '' ? 0 : parseFloat(volume));
  
  origCurrency = $('#oCurrValue').val();
  origCurrency = (origCurrency == '' ? 0 : parseFloat(origCurrency));
  destCurrency = $('#dCurrValue').val();
  destCurrency = (destCurrency == '' ? 0 : parseFloat(destCurrency));
  
  if (origCurrency == 0) {
    document.getElementById('result').innerHTML = "Please enter currency from " + loadPort + " to Dollars";
  }
  
  if (destCurrency == 0) {
    document.getElementById('result').innerHTML = "Please enter currency from " + dischargePort + " to Dollars";
  }
  if (origCurrency == 0 && destCurrency == 0) {
    return;
  }
   
  var fclSelected = $('#fcl').get(0).checked;
  if (fclSelected) {
    calculateFCLCost();
  } else {
    calculateLCLCost();
  }
}

function getLaneToCalculate(odLanes, city, isOrigin) {
  var cityAttr = isOrigin ? "oc" : "dc";
  var portAttr = isOrigin ? "loadPort" : "dischargePort";
  var citySameAsPortLane = null;
  for (var i = 0; i < odLanes.length; i++) {
    var odLane = odLanes[i];
    if (city == odLane.lane[cityAttr]) {
      return odLane;
    }
    if (citySameAsPortLane == null && odLane.lane[cityAttr] == odLane.lane[portAttr]) {
      citySameAsPortLane = odLane;
    }
  }
  
  return citySameAsPortLane;
}


/**
 * Calculate the FCL cost logics begin here.
 */
function calculateFCLCost() {
  var matchedLanes = {size: 0};
  for (var i = 0; i < FCL_LANES.length; i++) {
    var laneInfo = FCL_LANES[i];
    if (formatedLoadPort == laneInfo.lane.loadPort && formatedDischargePort == laneInfo.lane.dischargePort) {
	  var conTypeLanes = matchedLanes[laneInfo.lane.contType];
	  if (conTypeLanes == null) {
		  conTypeLanes = [];
		  matchedLanes[laneInfo.lane.contType] = conTypeLanes; 
		  matchedLanes.size++;
	  }
	  matchedLanes[laneInfo.lane.contType].push(laneInfo);
      matchedLanes.ohc = laneInfo.orig.hc;
      matchedLanes.oecc = laneInfo.orig.ecc;
      matchedLanes.dhc = laneInfo.dest.hc;
      matchedLanes.dicc = laneInfo.dest.icc;
    }
  }
  
  if (matchedLanes.size == 0) {
    document.getElementById('result').innerHTML = ("No Rate for lane from " + loadPort + " to " + dischargePort);
    return ;
  }
  
  var cost = 0;
  var msg = '';
  var containers = [{key: '20gp', num: num20Gp}, {key: '40gp', num: num40Gp}, {key: '40hq', num: num40Hq}];
  for (var i = 0; i < containers.length; i++) {
    var container = containers[i];
    var contTypeLanes = matchedLanes[container.key];
    var calulateMsg = '';
    if (container.num > 0 && contTypeLanes == null) {
      msg += "No " + container.key + " Rate for lane from " + loadPort + " to " + dischargePort + '<br/>';
    } else {
      var costForContainer = doCalculateFCLCost(container, contTypeLanes, origCurrency, destCurrency);
      if (isNaN(parseFloat(costForContainer))) {
        msg += (costForContainer + '<br/>');
      } else {
        cost += costForContainer;
      }
    }
  }
  
  var eccRequired = $('#eccRequired').get(0).checked;
  var iccRequried = $('#iccRequired').get(0).checked;
  var result = '';
  if (msg == '') {
    if (num20Gp > 0 || num40Gp > 0 || num40Hq > 0) {
      var origOneTimeFee = matchedLanes.ohc;
      if (eccRequired) {
        origOneTimeFee += matchedLanes.oecc;
      }
      var destOneTimeFee = matchedLanes.dhc;
      if (iccRequried) {
        destOneTimeFee += matchedLanes.dicc;
      }
      
      cost = (cost + origOneTimeFee * origCurrency);
      cost = (cost + destOneTimeFee * destCurrency);
    }
    result = (cost.toFixed(2) + ' $');
  } else {
    result = msg;
  }
  
  document.getElementById('result').innerHTML = result;
}

function doCalculateFCLCost(container, contTypeLanes, origCurrency, destCurrency) {
  var cost = 0;
  if (!container.num) {
    return cost;
  }
  
  var oCity = $('#originCity').val();
  var dCity = $('#destinationCity').val();
  var otRequired = $('#otRequired').get(0).checked;
  var dtRequired = $('#dtRequired').get(0).checked;
  
  var formatedOcity = tostr(oCity);
  var formatedDcity = tostr(dCity);
  
  var calculateMsg = '';
  var calculateOrigMsg = '';
  var origLane = getLaneToCalculate(contTypeLanes, formatedOcity, true);
  if (origLane == null) {
    if (otRequired) {
      calculateOrigMsg = 'No Trucking Rate for ' + container.key + ' from ' + oCity + '<br/>'; 
    } else {
      origLane = contTypeLanes[0];
    }
  }
  
  if (origLane != null) {
    var originCost = calculateOriginCost(container, origLane, origCurrency);
    if (isNaN(parseFloat(originCost))) {
      calculateOrigMsg += (originCost + '<br/>');
    } else {
      cost += originCost;
    }
  }
  calculateMsg = calculateOrigMsg;
  
  var calculateDestMsg = '';
  var destLane = getLaneToCalculate(contTypeLanes, formatedDcity, false);
  if (destLane == null) {
    if (dtRequired) {
      calculateDestMsg = 'No Trucking Rate for ' + container.key + ' to ' + dCity + '<br/>'; 
    } else {
      destLane = contTypeLanes[0];
    }
  }
  
  if (destLane != null) {
    var destCost = calculateDestinationCost(container, destLane, destCurrency);
    if (isNaN(parseFloat(destCost))) {
      calculateDestMsg += (destCost + '<br/>');
    } else {
      cost += destCost;
    }
    
    var oceanCost = calculateOceanCost(container, destLane);
    cost += oceanCost;
  }
  calculateMsg += calculateDestMsg;
  
  return calculateMsg == '' ? cost : calculateMsg;
}

function calculateOceanCost(container, lane) {
  return (lane.ocean.freignt + lane.ocean.vgm) * container.num;
}

function calculateOriginCost(container, lane, origCurrency) {
  var oc = tostr($('#originCity').val());

  var otRequired = $('#otRequired').get(0).checked;
  var oc2PortKM = $('#distanctFromOCity2Loading').val();

  var costOrigin = 0;
  costOrigin += lane.orig.thc;
  if(otRequired){
   if (oc2PortKM <= 50) {
	  if (lane.orig.tZone1==null){
	    if (lane.orig.t==null){
		  return "No Origin Trucking Rate"
		}else{
		  if (oc==lane.lane.oc){
		    costOrigin+=lane.orig.t;
		  }else{
		     return "No Origin Trucking Rate"
		  }
		}
	  }else{
	  costOrigin+=lane.orig.tZone1
	  }
   } else if (oc2PortKM<=100) {
	  if (lane.orig.tZone2==null){
	    if (lane.orig.t==null){
		  return "No Origin Trucking Rate"
		}else{
		  if (oc==lane.lane.oc){
		    costOrigin+=lane.orig.t;
		  }else{
		     return "No Origin Trucking Rate"
		  }
		}
	  }
	  else{
	  costOrigin+=lane.orig.tZone2
	  } 
   } else if (oc2PortKM>100) {
	  if (lane.orig.t==null){
	    return "No Origin Trucking Rate "
	  }else{
	    if(oc==lane.lane.oc){
		   costOrigin+=lane.orig.t;
		}else{
		  return "No Origin Trucking Rate"
		}
	  }
    
	
   }
  }
  return  costOrigin * container.num * origCurrency;
  
}

function calculateDestinationCost(container, lane, destCurrency) {
  var dc = tostr($('#destinationCity').val());
  var dtRequired = $('#dtRequired').get(0).checked;
  var dc2PortKM = $('#distanctFromDischarge2DCity').val();
  dc2PortKM = parseFloat(dc2PortKM);

  var costDestination = 0;
  costDestination += lane.dest.thc;
  if(dtRequired){
	  
    if (dc2PortKM <= 50) {
	  if (lane.dest.tZone1==null){
	    if (lane.dest.t==null){
		  return "No Destination Trucking Rate"
		}else{
		  if (dc==lane.lane.dc){
		    costDestination+=lane.dest.t;
		  }else{
		     return "No Destination Trucking Rate"
		  }
		}
	  }else{
	  costDestination+=lane.dest.tZone1
	  }
	} else if (dc2PortKM<=100) {
	  if (lane.dest.tZone2==null){
	    if (lane.dest.t==null){
		  return "No Destination Trucking Rate"
		}else{
		  if (dc==lane.lane.dc){
		    costDestination+=lane.dest.t;
		  }else{
		     return "No Destination Trucking Rate"
		  }
		}
	  }
	  else{
	  costDestination+=lane.dest.tZone2
	  } 
	} else if (dc2PortKM>100){
	  if (lane.dest.t==null){
	    return "No Destination Trucking Rate "
	  }else{
	    if(dc==lane.lane.dc){
		   costDestination+=lane.dest.t;
		}else{
		  return "No Destination Trucking Rate"
		}
	  }
	}

  }
  return  costDestination * container.num * destCurrency;
  
}


/**
 * Calculate the LCL cost logics begin here.
 */
function calculateLCLCost() {
  var matchedLanes = [];
  for (var i = 0; i < LCL_LANES.length; i++) {
    var laneInfo = LCL_LANES[i];
    if (formatedLoadPort == laneInfo.lane.loadPort && formatedDischargePort == laneInfo.lane.dischargePort) {
	    matchedLanes.push(laneInfo);
      matchedLanes.oStandard1 = laneInfo.orig.standard1;
      matchedLanes.oecc = laneInfo.orig.ecc;
      matchedLanes.dStandard1 = laneInfo.dest.standard1;
      matchedLanes.dicc = laneInfo.dest.icc;
    }
  }
  
  if (matchedLanes.length == 0) {
    document.getElementById('result').innerHTML = ("No Rate for lane from " + loadPort + " to " + dischargePort);
    return ;
  }
  
  var cost = doCalculateLCLCost(matchedLanes, origCurrency, destCurrency);
  var msg = '';
  if (isNaN(parseFloat(cost))) {
    msg += (cost + '<br/>');
  }
  
  var eccRequired = $('#eccRequired').get(0).checked;
  var iccRequried = $('#iccRequired').get(0).checked;
  var result = '';
  if (msg == '') {
    if (grossWeight > 0 && volume > 0) {
      var origOneTimeFee = matchedLanes.oStandard1;
      if (eccRequired) {
        origOneTimeFee += matchedLanes.oecc;
      }
      var destOneTimeFee = matchedLanes.dStandard1;
      if (iccRequried) {
        destOneTimeFee += matchedLanes.dicc;
      }
      
      cost = (cost + origOneTimeFee * origCurrency);
      cost = (cost + destOneTimeFee * destCurrency);
    }
    result = (cost.toFixed(2) + ' $');
  } else {
    result = msg;
  }
  
  document.getElementById('result').innerHTML = result;
}

function doCalculateLCLCost(contTypeLanes, origCurrency, destCurrency) {
  var cost = 0;
  if (grossWeight == 0 || volume == 0) {
    return cost;
  }
  
  var oCity = $('#originCity').val();
  var dCity = $('#destinationCity').val();
  var otRequired = $('#otRequired').get(0).checked;
  var dtRequired = $('#dtRequired').get(0).checked;
  
  var formatedOcity = tostr(oCity);
  var formatedDcity = tostr(dCity);
  
  var calculateMsg = '';
  var calculateOrigMsg = '';
  var origLane = getLaneToCalculate(contTypeLanes, formatedOcity, true);
  if (origLane == null) {
    if (otRequired) {
      calculateOrigMsg = 'No Trucking Rate from ' + oCity + '<br/>'; 
    } else {
      origLane = contTypeLanes[0];
    }
  }
  
  if (origLane != null) {
    var originCost = calculateLCLOriginCost(origLane, origCurrency);
    if (isNaN(parseFloat(originCost))) {
      calculateOrigMsg += (originCost + '<br/>');
    } else {
      cost += originCost;
    }
  }
  calculateMsg = calculateOrigMsg;
  
  var calculateDestMsg = '';
  var destLane = getLaneToCalculate(contTypeLanes, formatedDcity, false);
  if (destLane == null) {
    if (dtRequired) {
      calculateDestMsg = 'No Trucking Rate to ' + dCity + '<br/>'; 
    } else {
      destLane = contTypeLanes[0];
    }
  }
  
  if (destLane != null) {
    var destCost = calculateLCLDestinationCost(destLane, destCurrency);
    if (isNaN(parseFloat(destCost))) {
      calculateDestMsg += (destCost + '<br/>');
    } else {
      cost += destCost;
    }
    
    var oceanCost = calculateLCLOceanCost(destLane);
    cost += oceanCost;
  }
  calculateMsg += calculateDestMsg;
  
  return calculateMsg == '' ? cost : calculateMsg;
}

function calculateLCLOceanCost(lane) {
  var chargeWeight = Math.max(grossWeight / 1000, volume);
  return (Math.max(lane.ocean.freignt * chargeWeight, lane.ocean.minFreignt) + lane.ocean.vgm);
}

function calculateLCLOriginCost(lane, origCurrency) {
  var oc = tostr($('#originCity').val());

  var otRequired = $('#otRequired').get(0).checked;
  var oc2PortKM = $('#distanctFromOCity2Loading').val();

  var costOrigin = 0;
  var chargeWeight = Math.max(grossWeight / 1000, volume);
  costOrigin += Math.max((lane.orig.standard2 * chargeWeight), lane.orig.minStandard2);

  if (otRequired) {
    if (oc2PortKM <= 50) {
      if (lane.orig.tZone1==null){
        if (lane.orig.t==null){
          return "No Origin Trucking Rate"
        }else{
          if (oc==lane.lane.oc){
            costOrigin += Math.max(lane.orig.t*chargeWeight, lane.orig.mint);
          }else{
             return "No Origin Trucking Rate"
          }
        }
      }else{
        costOrigin += Math.max(lane.orig.tZone1*chargeWeight, lane.orig.mintZone1);
      }
    } else if (oc2PortKM<=100) {
      if (lane.orig.tZone2==null){
        if (lane.orig.t==null){
          return "No Origin Trucking Rate"
        }else{
          if (oc==lane.lane.oc){
            costOrigin += Math.max(lane.orig.t*chargeWeight, lane.orig.mint);
          }else{
             return "No Origin Trucking Rate"
          }
        }
      }
      else{
        costOrigin += Math.max(lane.orig.tZone2*chargeWeight, lane.orig.mintZone2);
      } 
    } else if (oc2PortKM>100) {
      if (lane.orig.t==null){
        return "No Origin Trucking Rate "
      }else{
        if(oc==lane.lane.oc){
         costOrigin += Math.max(lane.orig.t*chargeWeight, lane.orig.mint);
        }else{
          return "No Origin Trucking Rate"
        }
      }
    }
  }
   
  return costOrigin * origCurrency;
}

function calculateLCLDestinationCost(lane, destCurrency) {
  var dc = tostr($('#destinationCity').val());
  var dtRequired = $('#dtRequired').get(0).checked;
  var dc2PortKM = $('#distanctFromDischarge2DCity').val();
  dc2PortKM = parseFloat(dc2PortKM);

  var costDestination = 0;
  var chargeWeight = Math.max(grossWeight / 1000, volume);
  costDestination += Math.max((lane.dest.standard2 * chargeWeight), lane.dest.minStandard2);
  if(dtRequired){
    if (dc2PortKM <= 50) {
      if (lane.dest.tZone1==null){
        if (lane.dest.t==null){
          return "No Destination Trucking Rate"
        }else{
          if (dc==lane.lane.dc){
            costDestination += Math.max(lane.dest.t*chargeWeight, lane.dest.mint);
          }else{
             return "No Destination Trucking Rate"
          }
        }
      }else{
        costDestination += Math.max(lane.dest.tZone1*chargeWeight, lane.dest.mintZone1);
      }
    } else if (dc2PortKM<=100) {
      if (lane.dest.tZone2==null){
        if (lane.dest.t==null){
          return "No Destination Trucking Rate"
        }else{
          if (dc==lane.lane.dc){
            costDestination += Math.max(lane.dest.t*chargeWeight, lane.dest.mint);
          }else{
             return "No Destination Trucking Rate"
          }
        }
      }
      else{
        costDestination += Math.max(lane.dest.tZone2*chargeWeight, lane.dest.mintZone2);
      } 
    } else if (dc2PortKM>100){
      if (lane.dest.t==null){
        return "No Destination Trucking Rate "
      }else{
        if(dc==lane.lane.dc){
          costDestination += Math.max(lane.dest.t*chargeWeight, lane.dest.mint);
        }else{
          return "No Destination Trucking Rate"
        }
      }
    }
  }
  return  costDestination * destCurrency;
  
}

