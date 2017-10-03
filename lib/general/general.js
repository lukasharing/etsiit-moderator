const Palabra          = require("../../models/palabras");
const User             = require("../../models/user");
const preguntas        = require("../../util/preguntas");
const getRandom        = require("../../util/get-random");
const palabrasObject   = require("../../util/palabras");
const words            = "con,mas,eso,esto,del,las,los,por,para,que,qué,cómo,donde,cuando,cuándo,hay,este,\\".split(",");

module.exports = (bot) => {

  bot.on("text", async (msg) => {
    try {
      let username = msg.from.username || msg.from.first_name;
      let u = await User.findOne({username: username});
      if (!u) {
        u = new User({username: username, userId: msg.from.id});
        await u.save();
      }
      let palabras;
      while(palabra = /(\w+)y\W/g.exec(msg.text)) {
        let lowered = palabra.toLowerCase(); // Transformation.
        if (palabra.length >= 3 && ~words.indexOf(lowered)){
          let tmpP = await Palabra.findOne({palabra: palabra});
          if(!tmpP){
            tmpP = new Palabra({palabra: palabra});
          }
          tmpP.amount++;
          await tmpP.save();
        }

        if (palabrasObject.prohibidas.includes(lowered)) {
          msg.reply.text("Se tendrá en cuenta esa forma de hablar");
          give_warning(u, msg);
          return 0;
        }
      }
      return 0;
    } catch (err) { throw err; }
  });

  bot.on(["/start", "/hello"], (msg) => { msg.reply.text(`Hola ${msg.new_chat_member.username || msg.new_chat_member.first_name}!`); });
  bot.on(["newChatMembers"], async (msg) => {
    try {
      let username = msg.new_chat_member.username || msg.new_chat_member.first_name;
      if (username === "etsiit_moderator_bot") { return 0; }

      let user = new User({
        username: username,
        userId  : msg.new_chat_member.id
      });

      await user.save();
      msg.reply.text("Ha entrado un nuevo miembro");
      let array = getRandom(preguntas, 3);
      msg.reply.text(`Ha entrado un nuevo miembro \n ${array[0]} \n ${array[1]} \n ${array[2]}`);
    } catch (err) {
      if (err.code === 11000) {
        let u = await User.findOne({username:username});
        // Restore Advices.
        u.advices = 0;
        await u.save();
        msg.reply.text("Ha entrado un viejo miembro de nuevo");
      } else {
        throw err;
      }
    }
  });

  bot.on(["/aviso"], async (msg) => {
    try {

      let admins         = await bot.getChatAdministrators(msg.chat.id);
      let adminUsernames = new Array(admins.result.length).fill(0).map({a,b}=>{return admins[b].user.username; });

      if (!adminUsernames.includes(msg.from.username)) {
        msg.reply.text("No eres administrador");
        return 0;
      }
      let user = msg.text.split(" ")[1];
      if (typeof user === "undefined") {
        msg.reply.text("Necesito un usuario");
        return 0;
      }
      user = user.replace('@', '');
      let u = await User.findOne({username: user});
      if(u){
        give_warning(u, msg);
      } else {
        msg.reply.text(`Usuario @{user} no encontrado o bien nunca ha hablado`);
      }
    } catch (err) { throw err; }
  });

  function give_warning(u, msg){
    /* Aplica una mayor penalización.
       Dónde n -> Penalización, la fórmula es la siguiente:
       f(n) = 1/3 * [((13/10)^n) - 1].
    */
     u.advices += u.advices * 1.3 + 0.1;
     if (u.advices >= 3) {
       await bot.kickChatMember(msg.chat.id, u.userId);
       msg.reply.text(`${u.username} ha sido expulsado`);
       bot.sendVideo(msg.chat.id, "https://media.giphy.com/media/jkKcgtQcrAvks/giphy.gif");
     } else {
       msg.reply.text(`${u.username} tiene ${u.advices} avisos`);
     }
     await u.save();
  }

};
