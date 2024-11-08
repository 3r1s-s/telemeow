// this is just a template that can be used to create new plugins.

const originalFunction = sendPost

sendPost = function(){
    console.log("Hello World!");
    originalFunction();
}