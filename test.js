function f1(param){
    if(param === 1){
        throw "Invalid";
    }
    return "Done";
}
function f2(param){
    f1(param);
}
try {
    f2(1);
} catch (error) {
    console.log(error);
}