let str = "5th  September 2021 (9.00 pm)";
str = str.replace('  ', ' ');
let sp = str.split(' ');
console.log(sp);
// setInterval(() => {
//     console.log("5 seconds");
// }, 5000);