/*! For license information please see findBestPlay.ClientGameUI.js.LICENSE.txt */
(window.webpackChunk_warren_bank_scrabble=window.webpackChunk_warren_bank_scrabble||[]).push([["findBestPlay"],{"./src/game/findBestPlay.js":function(__unused_webpack___webpack_module__,__webpack_exports__,__webpack_require__){__webpack_require__.r(__webpack_exports__),__webpack_require__.d(__webpack_exports__,{findBestPlay:function(){return findBestPlay}});var dictionary,edition,crossChecks,board,report,_loadDictionary_js__WEBPACK_IMPORTED_MODULE_0__=__webpack_require__("./src/game/loadDictionary.js"),_Edition_js__WEBPACK_IMPORTED_MODULE_1__=__webpack_require__("./src/game/Edition.js"),_Tile_js__WEBPACK_IMPORTED_MODULE_2__=__webpack_require__("./src/game/Tile.js"),_Move_js__WEBPACK_IMPORTED_MODULE_3__=__webpack_require__("./src/game/Move.js");function _createForOfIteratorHelper(o,allowArrayLike){var it="undefined"!=typeof Symbol&&o[Symbol.iterator]||o["@@iterator"];if(!it){if(Array.isArray(o)||(it=function(o,minLen){if(!o)return;if("string"==typeof o)return _arrayLikeToArray(o,minLen);var n=Object.prototype.toString.call(o).slice(8,-1);"Object"===n&&o.constructor&&(n=o.constructor.name);if("Map"===n||"Set"===n)return Array.from(o);if("Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return _arrayLikeToArray(o,minLen)}(o))||allowArrayLike&&o&&"number"==typeof o.length){it&&(o=it);var i=0,F=function(){};return{s:F,n:function(){return i>=o.length?{done:!0}:{done:!1,value:o[i++]}},e:function(_e){throw _e},f:F}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var err,normalCompletion=!0,didErr=!1;return{s:function(){it=it.call(o)},n:function(){var step=it.next();return normalCompletion=step.done,step},e:function(_e2){didErr=!0,err=_e2},f:function(){try{normalCompletion||null==it.return||it.return()}finally{if(didErr)throw err}}}}function _arrayLikeToArray(arr,len){(null==len||len>arr.length)&&(len=arr.length);for(var i=0,arr2=new Array(len);i<len;i++)arr2[i]=arr[i];return arr2}function intersection(a,b){return a.filter((function(l){return b.indexOf(l)>=0}))}var bestScore=0;function isAnchor(col,row){return!board.at(col,row).isEmpty()&&(col>0&&board.at(col-1,row).isEmpty()||col<board.cols-1&&board.at(col+1,row).isEmpty()||row>0&&board.at(col,row-1).isEmpty()||row<board.rows-1&&board.at(col,row+1).isEmpty())}function computeCrossChecks(available){for(var xChecks=[],col=0;col<board.cols;col++){var thisCol=[];xChecks.push(thisCol);for(var row=0;row<board.rows;row++){var thisCell=[[],[]];if(thisCol[row]=thisCell,board.at(col,row).tile)thisCell[0].push(board.at(col,row).tile.letter),thisCell[1].push(board.at(col,row).tile.letter);else{for(var wordAbove="",r=row-1;r>=0&&board.at(col,r).tile;)wordAbove=board.at(col,r).tile.letter+wordAbove,r--;var wordBelow="";for(r=row+1;r<board.rows&&board.at(col,r).tile;)wordBelow+=board.at(col,r).tile.letter,r++;for(var wordLeft="",c=col-1;c>=0&&board.at(c,row).tile;)wordLeft=board.at(c,row).tile.letter+wordLeft,c--;var wordRight="";for(c=col+1;c!=board.cols&&board.at(c,row).tile;)wordRight+=board.at(c,row).tile.letter,c++;var _step,_iterator=_createForOfIteratorHelper(available);try{for(_iterator.s();!(_step=_iterator.n()).done;){var letter=_step.value,h=wordLeft+letter+wordRight,hIsWord=1===h.length||dictionary.hasWord(h),hIsSeq=hIsWord||col>0&&dictionary.hasSequence(h),v=wordAbove+letter+wordBelow,vIsWord=1===v.length||dictionary.hasWord(v),vIsSeq=vIsWord||row>0&&dictionary.hasSequence(v);hIsWord&&vIsSeq&&thisCell[0].push(letter),vIsWord&&hIsSeq&&thisCell[1].push(letter)}}catch(err){_iterator.e(err)}finally{_iterator.f()}}}}crossChecks=xChecks}function forward(col,row,dcol,drow,rackTiles,tilesPlayed,dNode,wordSoFar){var available,ecol=col+dcol,erow=row+drow;if(dNode.isEndOfWord&&wordSoFar.length>=2&&tilesPlayed>0&&(ecol==board.cols||erow==board.rows||!board.at(ecol,erow).tile)){var words=[],score=board.scorePlay(col,row,dcol,drow,wordSoFar,words)+edition.calculateBonus(tilesPlayed);score>bestScore&&(bestScore=score,report(new _Move_js__WEBPACK_IMPORTED_MODULE_3__.Move({placements:wordSoFar.filter((function(t){return!board.at(t.col,t.row).tile})),words:words,score:score})))}var playedTile=0;if(ecol<board.cols&&erow<board.rows)if(board.at(ecol,erow).isEmpty()){var haveBlank=rackTiles.find((function(l){return l.isBlank})),xc=crossChecks[ecol][erow][dcol];available=intersection(dNode.postLetters,haveBlank?xc:intersection(rackTiles.map((function(t){return t.letter})),xc)),playedTile=1}else available=[board.at(ecol,erow).tile.letter];else available=[];var _step2,_iterator2=_createForOfIteratorHelper(available);try{var _loop=function(){var letter=_step2.value,shrunkRack=rackTiles;if(playedTile>0){var rackTile=shrunkRack.find((function(l){return l.letter===letter}))||shrunkRack.find((function(l){return l.isBlank}));wordSoFar.push(new _Tile_js__WEBPACK_IMPORTED_MODULE_2__.Tile({letter:letter,isBlank:rackTile.isBlank,score:rackTile.score,col:ecol,row:erow})),shrunkRack=shrunkRack.filter((function(t){return t!==rackTile}))}else wordSoFar.push(board.at(ecol,erow).tile);var _step3,_iterator3=_createForOfIteratorHelper(dNode.postNodes);try{for(_iterator3.s();!(_step3=_iterator3.n()).done;){var post=_step3.value;post.letter===letter&&forward(ecol,erow,dcol,drow,shrunkRack,tilesPlayed+playedTile,post,wordSoFar)}}catch(err){_iterator3.e(err)}finally{_iterator3.f()}wordSoFar.pop()};for(_iterator2.s();!(_step2=_iterator2.n()).done;)_loop()}catch(err){_iterator2.e(err)}finally{_iterator2.f()}}function back(col,row,dcol,drow,rackTiles,tilesPlayed,anchorNode,dNode,wordSoFar){var available,ecol=col-dcol,erow=row-drow,playedTile=0;if(ecol>=0&&erow>=0)if(board.at(ecol,erow).isEmpty()){var haveBlank=rackTiles.find((function(l){return l.isBlank})),xc=crossChecks[ecol][erow][dcol];available=intersection(dNode.preLetters,haveBlank?xc:intersection(rackTiles.map((function(l){return l.letter})),xc)),playedTile=1}else available=[board.at(ecol,erow).tile.letter];else available=[];var _step4,_iterator4=_createForOfIteratorHelper(available);try{var _loop2=function(){var letter=_step4.value,shrunkRack=rackTiles;if(playedTile>0){var tile=shrunkRack.find((function(l){return l.letter===letter}))||shrunkRack.find((function(l){return l.isBlank}));wordSoFar.unshift(new _Tile_js__WEBPACK_IMPORTED_MODULE_2__.Tile({letter:letter,isBlank:tile.isBlank,score:tile.score,col:ecol,row:erow})),shrunkRack=shrunkRack.filter((function(t){return t!==tile}))}else wordSoFar.unshift(board.at(ecol,erow).tile);var _step5,_iterator5=_createForOfIteratorHelper(dNode.preNodes);try{for(_iterator5.s();!(_step5=_iterator5.n()).done;){var pre=_step5.value;pre.letter===letter&&back(ecol,erow,dcol,drow,shrunkRack,tilesPlayed+playedTile,anchorNode,pre,wordSoFar)}}catch(err){_iterator5.e(err)}finally{_iterator5.f()}wordSoFar.shift()};for(_iterator4.s();!(_step4=_iterator4.n()).done;)_loop2()}catch(err){_iterator4.e(err)}finally{_iterator4.f()}0==dNode.preNodes.length&&(erow<0||ecol<0||board.at(ecol,erow).isEmpty())&&forward(col+dcol*(wordSoFar.length-1),row+drow*(wordSoFar.length-1),dcol,drow,rackTiles,tilesPlayed,anchorNode,wordSoFar)}function find(rack){var rackTiles=rack.sort((function(a,b){return a.letter<b.letter?-1:a.score>b.score?1:0})).reverse();report("Finding best play for rack "+rack.map((function(t){return t.stringify()})).join(",")),report("with dictionary ".concat(dictionary.name)),report("in edition ".concat(edition.name)),report("on\n"+board.stringify()),assert(edition instanceof _Edition_js__WEBPACK_IMPORTED_MODULE_1__.Edition,"Setup failure"),report("Starting findBestPlay computation for "+rackTiles.map((function(t){return t.stringify()})).join(",")+" on "+board.stringify()),bestScore=0;for(var anchored=!1,col=0;col<board.cols;col++)for(var row=0;row<board.rows;row++)if(isAnchor(col,row)){if(!anchored)computeCrossChecks(rackTiles.find((function(l){return l.isBlank}))?edition.alphabet:rackTiles.filter((function(t){return!t.isBlank})).map((function(t){return t.letter}))),anchored=!0;var _step7,anchorTile=board.at(col,row).tile,_iterator7=_createForOfIteratorHelper(dictionary.getSequenceRoots(anchorTile.letter));try{for(_iterator7.s();!(_step7=_iterator7.n()).done;){var anchorNode=_step7.value;back(col,row,1,0,rackTiles,0,anchorNode,anchorNode,[anchorTile]),back(col,row,0,1,rackTiles,0,anchorNode,anchorNode,[anchorTile])}}catch(err){_iterator7.e(err)}finally{_iterator7.f()}}anchored||function(rackTiles){var ruck=rackTiles.map((function(l){return l.letter?l.letter:" "})).join(""),choices=dictionary.findAnagrams(ruck),drow=Math.round(Math.random()),dcol=(drow+1)%2,vertical=0===dcol;for(var choice in bestScore=0,choices){var _step6,placements=[],shrunkRack=rackTiles,_iterator6=_createForOfIteratorHelper(choice.split(""));try{var _loop3=function(){var c=_step6.value,rackTile=shrunkRack.find((function(t){return t.letter===c}))||shrunkRack.find((function(t){return t.isBlank}));assert(rackTile,"Can't do this with the available tiles"),placements.push(new _Tile_js__WEBPACK_IMPORTED_MODULE_2__.Tile({letter:c,isBlank:rackTile.isBlank,score:rackTile.score})),shrunkRack=shrunkRack.filter((function(t){return t!==rackTile}))};for(_iterator6.s();!(_step6=_iterator6.n()).done;)_loop3()}catch(err){_iterator6.e(err)}finally{_iterator6.f()}for(var mid=vertical?board.midcol:board.midrow,end=mid;end<mid+choice.length;end++){var col=vertical?mid:end,row=vertical?end:mid,score=board.scorePlay(col,row,dcol,drow,placements)+edition.calculateBonus(placements.length);if(score>bestScore){bestScore=score;for(var i=0;i<placements.length;i++){var pos=end-placements.length+i+1;placements[i].col=0==dcol?board.midcol:pos*dcol,placements[i].row=0==drow?board.midrow:pos*drow}report(new _Move_js__WEBPACK_IMPORTED_MODULE_3__.Move({placements:placements,words:[{word:choice,score:score}],score:score}))}}}}(rackTiles)}function findBestPlay(game,rack,listener,dict){return report=listener,board=game.board,Promise.all([(0,_loadDictionary_js__WEBPACK_IMPORTED_MODULE_0__.loadDictionary)(dict).then((function(dic){return dictionary=dic})),_Edition_js__WEBPACK_IMPORTED_MODULE_1__.Edition.load(game.edition).then((function(ed){return edition=ed}))]).then((function(){return find(rack)}))}}}]);
//# sourceMappingURL=findBestPlay.ClientGameUI.js.map