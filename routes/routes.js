const express=require('express');
const routes=express.Router();
const {main}=require("../scrappfunc/scrapper")

routes.post("/indead",async(req,res)=>{
try{
  const {skill}=req.body;
  console.log(skill)
  let scrapper=await main(skill);
  return res.json({
    status:"ok",
    list:scrapper?.list||{}
  })
}catch(e){
    console.log(e)
  return res.status(500).send(e)
}
})



module.exports=routes;