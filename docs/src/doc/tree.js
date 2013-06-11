/* 
 * knowing three tele page: secondary tree module;
 * author: yumen.gk@taobao.com
 * create T: 2012-11-1
 * log: 20130320:  
    1，树懒加载；
    2，suggest 改为popup；
    3，suggest 匹配过程在json数据中搜索（引入fullpath）;
    4，引入经典 __index 多级索引管理；
 */

KISSY.add(function(S, FuzzyMatch, Overlay, TT){
  var $ = S.all;
  var DATAS = {
    treeTpl: 
      '<ul class="J_Branch" style="display: none;"> \
        {{#each data as value index}}\
        <li>\
          <a class="\
          {{#if value.children}}\
            J_Root root\
          {{#else}}\
            J_Leaf leaf\
          {{/if}}\
          " data-tree-index="{{__index}}{{index}}" title="{{value.label}}" data-id="{{value.id}}">{{value.label}}\
          {{#if value.children}}\
            <b class="J_ToggleBranch"></b>\
          {{/if}}\
          </a>\
        </li>\
        {{/each}}\
      </ul>'
    ,suggestTpl: 
      '<ul class="tree-search-suggest">\
        {{#if matchedRet.length}}\
          {{#each matchedRet as item index}}\
            <li class="J_SearchSuggestItem" data-title="{{fuzzyMatchData[item.index].value}}" data-index="{{item.info}}">{{fuzzyMatchData[item.index].fullpath}}{{item.textShow}}</li>\
          {{/each}}\
        {{#else}}\
          <li><strong>未找到匹配项</strong></li>\
        {{/if}}\
      </ul>'
  }
  function Tree(config){
    this.box = config.box;

    this.data = config.data;
    if( !this.data ){
      return false;
    }

    this.selectedLeafId = config.selectedLeafId;

    this.fuzzyMatchPopupCls = config.popupCls || '';

    this.openFuzzyMatch = true;

    this.leafFreeze = false;

    this.fuzzyMatchData = [];//提供给 fuzzyMatch组件使用的模糊匹配数组

    //包装树的json数据
    this._formateTreeData();

    
    this._init();

    //event
    this.eventHandle();
    this.documentEvent();

    // console.log(this.data, this.fuzzyMatchData);
  }
  var o = {
    _init: function(){
      var self = this;
      
      //打开模糊匹配功能
      if( self.openFuzzyMatch ){
        self.fuzzyMatch = new FuzzyMatch();
        self.box.html( '<div class="tree-search-wrap">\
                          <input type="text" placeholder="查找..." class="tree-search J_TreeSearch" />\
                        </div>\
                        <div class="s-tree"></div>' );

        //模糊匹配 suggest列表
        var popupTrigger =  self.box.one('.J_TreeSearch');
        self.fuzzyMatchPopup = new Overlay.Popup({
          elCls: 'fuzzy-match-popup ' + self.fuzzyMatchPopupCls,
          align: {
              node: popupTrigger,
              points: ["tl","tl"],
              offset: ['-7', '-5']
          }
        });
      }
      else{
        self.box.html( '<div class="s-tree">' + '' + '</div>' );
      }

      //加载主干根
      self.addBranch(-1);


      //根据 bizId  默认选中叶子节点
      if( self.selectedLeafId != undefined ){
        var __index = self.findLeafById( self.selectedLeafId );
        //找到 id 相同的节点
        if( __index ){
          self.findLeafByIndex( __index );
        }
        else{
          //找不到节点， bizId清空
          GD && GD.update({
            bizId: ''
          });
        }
      }
    }

    //event handle
    ,eventHandle: function(){
      var self = this;

      self.fuzzyMatchPopup.on('afterRenderUI', function(){
        self.fuzzyMatchPopup.get('contentEl').on('mouseleave', function(){
          self.fuzzyMatchPopup.hide();
        })
        self.fuzzyMatchPopup.get('contentEl').on('click', function(e){
          self.fuzzyMatchPopup.hide();

          var target = $( e.target );

          //suggest item clicked
          if( target.hasClass('J_SearchSuggestItem') || target.parent('.J_SearchSuggestItem') ){

            if( !target.hasClass('J_SearchSuggestItem')){
              target = target.parent('.J_SearchSuggestItem');
            }
            self.box.one('.J_TreeSearch').val( target.attr('data-title') );
            var __index = target.attr('data-index');

            //定位到指定 节点
            var selectLeaf = self.findLeafByIndex(__index, false);
            var offsetTop = selectLeaf.offset().top;
            self.box.scrollTop(offsetTop - 88);

            selectLeaf.fire('click');
            //fire click
          }
        })
      });

      self.box.on('click', function(e){
        var target = $(e.target);
        e.halt();

        //没有子分支的 叶子被点中
        if( target.hasClass('J_Leaf') && !target.hasClass('select') ){

          //style exchange

          self.fire('leaf-change',{
            leafId: target.attr('data-id')
            ,title: target.attr('title')
          });

          if( self.leafFreeze == true){
            self.leafFreeze = false;
            return ;
          }
          else{
            self.box.one('.s-tree').all('a').removeClass('select');
            target.addClass('select');
          }

        }
        //有分支的 叶子被点中
        else if( target.hasClass('J_Root') || target.parent('.J_Root') ){
          if( !target.hasClass('J_Root')){
            target = target.parent('.J_Root');
          }

          target.siblings().slideToggle(0.3);
          target.toggleClass('root-open');

          //未加载子分支
          if( target.attr('data-branch-loaded') != 'true' ){
            var index = target.attr('data-tree-index');
            self.addBranch(index);
          }
        }

      });

      //---------------------------------suggest 模糊匹配
      var matchTimeout = null;
      self.box.on('keyup click', function(e){
        var target = $(e.target);
        if( target.hasClass('J_TreeSearch') ){
          matchTimeout && clearTimeout( matchTimeout );
          matchTimeout = setTimeout(function(){
            self.handleMatchedRet( self.fuzzyMatch.match( target.val(), self.fuzzyMatchData) );
          }, 200);
        }
      });
    }

    ,documentEvent: function(){
      $(document).on('click', function(e){
        if( $(e.target).parent('.fuzzy-match-popup') == undefined && $(e.target).parent('.J_TreeSearch') == undefined ){
        }
      })
    }

    //处理 模糊匹配结果集
    ,handleMatchedRet: function(matchedRet){
      if( matchedRet == null){
        this.fuzzyMatchPopup.hide().set('content','');
        return ;
      }

      for( var i = 0; i < matchedRet.length; ++i ){
        var textShow = this.fuzzyMatchData[matchedRet[i].index].value;
        textShow = '<span>' + textShow.substr(0, matchedRet[i].begin) + '<strong>' + textShow.substr(matchedRet[i].begin, matchedRet[i].end - matchedRet[i].begin) + '</strong>' + textShow.substr(matchedRet[i].end) + '</span>';

        matchedRet[i].textShow = textShow;
      }

      var html = TT(DATAS.suggestTpl).render({
        matchedRet: matchedRet,
        fuzzyMatchData: this.fuzzyMatchData
      });

      //show suggestion
      this.fuzzyMatchPopup.show().set('content', html);
    }

    //return  $(leaf);
    ,findLeafByIndex: function(index, selectIt){
      var __index = index.split('-');
      parentRoot = this.box.one('.s-tree');
      for(var i = 0; i < __index.length; ++i){
        parentRoot = parentRoot.one('ul').show().children('li').item( parseInt(__index[i]) );

        // 存在 子分支， 未加载子分支
        if( __index[i+1] != undefined && !parentRoot.one('a').hasAttr('data-branch-loaded') && !parentRoot.one('ul') ){
          //todo 
          var branchIndex = __index[0];
          for( var j = 1; j <= i; ++j){
            branchIndex += '-' + __index[j];
          }
          this.addBranch( branchIndex );
        }
      }
      this.box.one('.s-tree').all('a').removeClass('select');
      if( selectIt === undefined || selectIt === true){
        return parentRoot.one('a').addClass('select');
      }
      else{
        return parentRoot.one('a');
      }
    }

    /**
      *
      * 根据 leafId 获取对应在树中的节点
      * return __index
      */
    ,findLeafById: function(leafId, branchData){
      var self = this;
      var leaf = null;

      if( !branchData ) branchData = self.data;

      for(var i = 0; i < branchData.length; ++i){
        if( branchData[i].id == leafId ){
          return branchData[i].__index;
        }
        else if( S.isArray( branchData[i].children ) ){
          var ret = this.findLeafById(leafId, branchData[i].children);
          if( ret !== false){
            return ret;
          }
        }
      }
      return false;
    }

    /**
      * 加载树的一个分支
      */
    ,addBranch: function(index){
      var self = this;

      //======================================准备 父节点 和 分支树的数据
      //加载的是 主干根
      if(index == -1){
        var __index = '';
        var branchData = self.data;
        var parentRoot = self.box.one('.s-tree');
      }
      //加载的 分支根
      else{
        var __index = index.split('-');
        var branchData = self.data;
        var parentRoot = self.box.one('.s-tree');
        for( var i = 0; i < __index.length; ++i ){
          branchData = branchData[ __index[i] ].children;
          parentRoot = parentRoot.one('ul').children('li').item( parseInt(__index[i]) );
        }
      }
      html = TT(DATAS.treeTpl).render({
        data: branchData,
        __index: __index ? (__index.join('-') + '-') : ('')
      });
      
      $(html).appendTo(parentRoot).show(0.3)

      if( index != -1){
        parentRoot.one('a').attr('data-branch-loaded', 'true').addClass('root-open');
      }
    }

    /**
      * 根据bizId，展开一个根结点
      */
    ,expandById: function(id){
      var __index = this.findLeafById(id);
      if( __index ){
        this.findLeafByIndex( __index, false).fire('click');

      } 
    }

    /**
      * 1：包转树json
      * 2：树json 格式化为模糊匹配可用的数据格式
      */
    ,_formateTreeData: function(index, data){
      if(index == undefined) {
        var index = '';
        var data = this.data;
      }
      else{
        var index = index + '-';
      }

      for(var i = 0; i < data.length; ++i){
        data[i].__index = index + i;
        this.fuzzyMatchData.push({
          value: data[i].label || data[i].name,
          info: data[i].__index,
          fullpath: (data[i].fullpath!=undefined)? ( data[i].fullpath.replace(/^>>|>>[^>]*(>>)?$/g, '') + '>>' ) : ('')
        });

        //组织结构树
        if( data[i].label == undefined ){
          data[i].label = data[i].name;
        }

        if( S.isArray( data[i].children ) ){
          this._formateTreeData( data[i].__index, data[i].children );
        }
      }
    }

    //冻结tree 叶子 的click 处理， 有效期：一次点击
    ,freeze: function(){
      this.leafFreeze = true;
    }

  };
  S.augment(Tree, S.EventTarget, o);

  return Tree;
},{
  requires: ['./fuzzy-match', 'overlay', 'template']
});