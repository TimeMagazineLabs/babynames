// Thx, Mike https://github.com/mbostock/d3/tree/master/src

var helper = {};

helper.entries = function(map) {
  var entries = [];
  for (var key in map) entries.push({key: key, value: map[key]});
  return entries;
};

helper.keys = function(map) {
  var keys = [];
  for (var key in map) keys.push(key);
  return keys;
};

helper.values = function(map) {
  var values = [];
  for (var key in map) values.push(map[key]);
  return values;
};

helper.sum = function(array, f) {
  var s = 0,
      n = array.length,
      a,
      i = -1;

  if (arguments.length === 1) {
    while (++i < n) if (!isNaN(a = +array[i])) s += a;
  } else {
    while (++i < n) if (!isNaN(a = +f.call(array, array[i], i))) s += a;
  }

  return s;
};

helper.max = function(array, f) {
  var i = -1,
      n = array.length,
      a,
      b;
  if (arguments.length === 1) {
    while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
    while (++i < n) if ((b = array[i]) != null && b > a) a = b;
  } else {
    while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
    while (++i < n) if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
  }
  return a;
};

module.exports = helper;