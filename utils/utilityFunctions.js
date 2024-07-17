exports.capitaliseSlug = (string) => {
  const words = string.split('-');
  const capitalisedWords = words.map(
    (word) => word[0].toUpperCase() + word.substr(1)
  );
  return capitalisedWords.join(' ');
};

exports.filterObject = (obj, fields) => {
  const output = {};
  Object.keys(obj).forEach((key) => {
    if (fields.includes(key)) {
      output[key] = obj[key];
    }
  });
  return output;
};
