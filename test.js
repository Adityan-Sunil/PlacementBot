let now = new Date(1630812600000);
let now1 = new Date()
console.log(now.toLocaleString('en-US', {timeZone:'IST'}));
console.log(now1.toUTCString());
// setInterval(() => {
//     console.log("5 seconds");
// }, 5000);