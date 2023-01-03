/*! For license information please see GameDialog.StandaloneGamesUI.js.LICENSE.txt */
(window.webpackChunk_warren_bank_scrabble=window.webpackChunk_warren_bank_scrabble||[]).push([["GameDialog"],{"./src/browser/Dialog.js":function(__unused_webpack___webpack_module__,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{Dialog:function(){return Dialog}});var $=__webpack_require__("./node_modules/jquery/dist/jquery.js");function _typeof(obj){return _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(obj){return typeof obj}:function(obj){return obj&&"function"==typeof Symbol&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj},_typeof(obj)}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,(arg=descriptor.key,key=void 0,key=function(input,hint){if("object"!==_typeof(input)||null===input)return input;var prim=input[Symbol.toPrimitive];if(void 0!==prim){var res=prim.call(input,hint||"default");if("object"!==_typeof(res))return res;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===hint?String:Number)(input)}(arg,"string"),"symbol"===_typeof(key)?key:String(key)),descriptor)}var arg,key}var Dialog=function(){function Dialog(id,options){var _this=this;!function(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}(this,Dialog),this.id=id,this.options=options,this.$dlg=$("#".concat(id)),(0===this.$dlg.length?$.get(Platform.getFilePath("html/".concat(options.html||id,".html"))).then((function(html_code){$("body").append($(document.createElement("div")).attr("id",id).addClass("dialog").html(html_code)),_this.$dlg=$("#".concat(id))})):Promise.resolve()).then((function(){return _this.$dlg.dialog({title:options.title,width:"auto",minWidth:400,modal:!0,open:function(){_this.$dlg.data("dialog_created")?_this.openDialog():(_this.$dlg.data("dialog_created",!0),_this.createDialog().then((function(){return _this.openDialog()})))}})}))}var Constructor,protoProps,staticProps;return Constructor=Dialog,(protoProps=[{key:"createDialog",value:function(){var _this2=this;this.$dlg.find("[data-i18n]").i18n(),this.$dlg.find("input[data-i18n-placeholder]").each((function(){$(this).attr("placeholder",$.i18n($(this).data("i18n-placeholder")))})),this.$dlg.find("label[data-image]").each((function(){$(this).css("background-image",'url("'.concat($(this).data("image"),'")'))}));var self=this;return this.$dlg.find("select").selectmenu().on("selectmenuchange",(function(){$(this).blur(),self.$dlg.data("this").enableSubmit()})),setTimeout((function(){return _this2.$dlg.find("select[data-i18n-tooltip] ~ .ui-selectmenu-button").tooltip({items:".ui-selectmenu-button",position:{my:"left+15 center",at:"right center",within:"body"},content:function(){return $.i18n($(this).prev().data("i18n-tooltip"))}})}),100),this.$dlg.find(".submit").on("click",(function(){return _this2.submit()})),this.enableSubmit(),console.debug("Created",this.id),Promise.resolve()}},{key:"openDialog",value:function(){return console.debug("Opening",this.id),this.$dlg.data("this",this),Promise.resolve(this)}},{key:"canSubmit",value:function(){return!0}},{key:"enableSubmit",value:function(){this.$dlg.find(".submit").prop("disabled",!this.canSubmit())}},{key:"getFieldValues",value:function(p){return p||(p={}),this.$dlg.find("input[name],select[name],textarea[name]").each((function(){var value,name=$(this).attr("name");if("checkbox"===this.type)value=!!$(this).is(":checked");else if("radio"===this.type){if(!$(this).is(":checked"))return;name=this.id,value=!0}else if("number"===this.type){if(value=parseInt($(this).val()),isNaN(value))return}else value=$(this).val()||$(this).text();void 0===p[name]?p[name]=value:"string"==typeof p[name]?p[name]=[p[name],value]:p[name].push(value)})),p}},{key:"submit",value:function(vals){var _this3=this;this.$dlg.dialog("close"),vals=this.getFieldValues(vals),this.options.onSubmit&&this.options.onSubmit(this,vals),this.options.postAction&&$.ajax({url:this.options.postAction,type:"POST",contentType:"application/json",data:JSON.stringify(vals)}).then((function(data){"function"==typeof _this3.options.postResult&&_this3.options.postResult(data)})).catch((function(jqXHR){"function"==typeof _this3.options.error?_this3.options.error(jqXHR):console.error(jqXHR.responseText)}))}}])&&_defineProperties(Constructor.prototype,protoProps),staticProps&&_defineProperties(Constructor,staticProps),Object.defineProperty(Constructor,"prototype",{writable:!1}),Dialog}()},"./src/browser/GameDialog.js":function(__unused_webpack___webpack_module__,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{GameDialog:function(){return GameDialog}});var _Dialog_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./src/browser/Dialog.js"),$=__webpack_require__("./node_modules/jquery/dist/jquery.js");function _typeof(obj){return _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(obj){return typeof obj}:function(obj){return obj&&"function"==typeof Symbol&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj},_typeof(obj)}function _defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||!1,descriptor.configurable=!0,"value"in descriptor&&(descriptor.writable=!0),Object.defineProperty(target,(arg=descriptor.key,key=void 0,key=function(input,hint){if("object"!==_typeof(input)||null===input)return input;var prim=input[Symbol.toPrimitive];if(void 0!==prim){var res=prim.call(input,hint||"default");if("object"!==_typeof(res))return res;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===hint?String:Number)(input)}(arg,"string"),"symbol"===_typeof(key)?key:String(key)),descriptor)}var arg,key}function _get(){return _get="undefined"!=typeof Reflect&&Reflect.get?Reflect.get.bind():function(target,property,receiver){var base=_superPropBase(target,property);if(base){var desc=Object.getOwnPropertyDescriptor(base,property);return desc.get?desc.get.call(arguments.length<3?target:receiver):desc.value}},_get.apply(this,arguments)}function _superPropBase(object,property){for(;!Object.prototype.hasOwnProperty.call(object,property)&&null!==(object=_getPrototypeOf(object)););return object}function _setPrototypeOf(o,p){return _setPrototypeOf=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(o,p){return o.__proto__=p,o},_setPrototypeOf(o,p)}function _createSuper(Derived){var hasNativeReflectConstruct=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}();return function(){var result,Super=_getPrototypeOf(Derived);if(hasNativeReflectConstruct){var NewTarget=_getPrototypeOf(this).constructor;result=Reflect.construct(Super,arguments,NewTarget)}else result=Super.apply(this,arguments);return _possibleConstructorReturn(this,result)}}function _possibleConstructorReturn(self,call){if(call&&("object"===_typeof(call)||"function"==typeof call))return call;if(void 0!==call)throw new TypeError("Derived constructors may only return object or undefined");return function(self){if(void 0===self)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return self}(self)}function _getPrototypeOf(o){return _getPrototypeOf=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(o){return o.__proto__||Object.getPrototypeOf(o)},_getPrototypeOf(o)}var GameDialog=function(_Dialog){!function(subClass,superClass){if("function"!=typeof superClass&&null!==superClass)throw new TypeError("Super expression must either be null or a function");subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,writable:!0,configurable:!0}}),Object.defineProperty(subClass,"prototype",{writable:!1}),superClass&&_setPrototypeOf(subClass,superClass)}(GameDialog,_Dialog);var Constructor,protoProps,staticProps,_super=_createSuper(GameDialog);function GameDialog(options){return function(instance,Constructor){if(!(instance instanceof Constructor))throw new TypeError("Cannot call a class as a function")}(this,GameDialog),_super.call(this,"GameDialog",$.extend({title:$.i18n("title-game-dlg",options.game.key)},options))}return Constructor=GameDialog,(protoProps=[{key:"createDialog",value:function(){var _this=this;return this.$dlg.find("button[name=options]").button().on("click",(function(){var dlg=_this.$dlg.data("this");dlg.options.ui.gameOptions(dlg.options.game)})),this.$dlg.find("button[name=observe]").hide().button().on("click",(function(){_this.$dlg.dialog("close");var dlg=_this.$dlg.data("this");dlg.options.ui.observe(dlg.options.game)})),this.$dlg.find("button[name=join]").hide().button().on("click",(function(){_this.$dlg.dialog("close");var dlg=_this.$dlg.data("this");dlg.options.ui.joinGame(dlg.options.game)})),this.$dlg.find("button[name=robot]").hide().button().on("click",(function(){var dlg=_this.$dlg.data("this");dlg.options.ui.addRobot(dlg.options.game)})),this.$dlg.find("button[name=invite]").hide().button().on("click",(function(){var dlg=_this.$dlg.data("this");dlg.options.ui.invitePlayers(dlg.options.game)})),this.$dlg.find("button[name=another]").hide().button().on("click",(function(){var dlg=_this.$dlg.data("this");dlg.options.ui.anotherGame(dlg.options.game)})),this.$dlg.find("button[name=delete]").hide().button().on("click",(function(){_this.$dlg.dialog("close");var dlg=_this.$dlg.data("this");dlg.options.ui.deleteGame(dlg.options.game)})),_get(_getPrototypeOf(GameDialog.prototype),"createDialog",this).call(this)}},{key:"populate",value:function(game){var _this2=this;game?this.options.game=game:game=this.options.game,this.$dlg.attr("name",game.key),this.$dlg.find("button[name=options]").toggle(this.options.ui.session&&0===game.turns.length),this.$dlg.find("div[name=headline]").empty().append("".concat(game.edition," ").concat(game.dictionary||""));var $table=this.$dlg.find(".player-table").empty().attr("name",game.key),isActive=!game.hasEnded();game.getPlayers().forEach((function(player){return $table.append(_this2.options.ui.$player(game,player,isActive))})),isActive&&$table.find("#player".concat(game.whosTurnKey)).addClass("whosTurn");var $join=this.$dlg.find("button[name=join]").hide(),$robot=this.$dlg.find("button[name=robot]").hide(),$invite=this.$dlg.find("button[name=invite]").hide(),$another=this.$dlg.find("button[name=another]").hide(),$observe=this.$dlg.find("button[name=observe]").hide(),$delete=this.$dlg.find("button[name=delete]").hide();this.options.ui.session?($delete.show(),isActive?(!game.getPlayerWithKey(this.options.ui.session.key)&&(0===(game.maxPlayers||0)||game.getPlayers().length<game.maxPlayers)&&$join.show().button("option",{label:$.i18n("Join game")}),this.options.ui.getSetting("canEmail")&&$invite.show(),game.getPlayers().find((function(p){return p.isRobot}))||$robot.show()):($observe.show(),game.nextGameKey||$another.show())):$observe.show()}},{key:"openDialog",value:function(){return this.populate(),_get(_getPrototypeOf(GameDialog.prototype),"openDialog",this).call(this)}}])&&_defineProperties(Constructor.prototype,protoProps),staticProps&&_defineProperties(Constructor,staticProps),Object.defineProperty(Constructor,"prototype",{writable:!1}),GameDialog}(_Dialog_js__WEBPACK_IMPORTED_MODULE_0__.Dialog)}}]);
//# sourceMappingURL=GameDialog.StandaloneGamesUI.js.map