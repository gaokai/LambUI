/* 
 * local data fuzzy match
 * author: yumen.gk@taobao.com
 * create T: 2012-1-10
 */

/**
  * 提供一个字符串数组
  * 执行match方法，return一个以匹配对象为元素的数组
  */
KISSY.add(function(S){

	function FuzzyMatch(config){
		//可以不要这个配置项，转移到 match方法的参数中
		this.listData = config ? config.listData : [];
	}

	var o = {

		/**
		  *	搜索关键字、 等待匹配的数组
		  * 返回 一个以对象为元素的数组
		  */
		match: function(keyWord,  listDataOut){
			var self = this;
			if( S.trim(keyWord) == '' ){
				return null;
			}

			if( listDataOut != undefined && S.isArray( listDataOut )){
				var listData = listDataOut;
			}
			else {
				var listData = self.listData;
			}

			keyWord = keyWord.replace(/\|/g, '\\|').replace(/\(/g,'\\(').replace(/\)/g,'\\)');;
			
			var reg = new RegExp( '('+S.trim(keyWord).replace(/\s/g, '|')+')','gi' );

			var matchedObj = [];
			for( var j = 0; j < listData.length; ++j ){
				reg.lastIndex = 0;
				var regRet = null;
				while( (regRet = reg.exec(listData[j].value ) ) ){
					matchedObj.push({
						begin: regRet.index
						,end: reg.lastIndex
						,index: j
						,info: listData[j].info
					});
				}
			}

			return matchedObj;
		}
	}

	S.augment(FuzzyMatch, S.EventTarget, o);

  return FuzzyMatch;

});