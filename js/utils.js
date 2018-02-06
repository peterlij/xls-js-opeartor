// getElementById
function $id(id) {
  return document.getElementById(id);
}

function tostr(str) {
  var normStr = '';
  if (str!==null&&str!==undefined)
  {
    normStr = str.replace(/^\s+|\s+$/g,"");
  }
  return normStr.toLowerCase();
}

function tonum(numstr) {
  var normStr = tostr(numstr);
  if (normStr == '' || normStr == '-') {
    return null;
  }
  normStr = normStr.replace(/,/g, '');
  normStr = normStr.replace(/\$/g, '');
  return parseFloat(normStr);
}