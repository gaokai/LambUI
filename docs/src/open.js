KISSY.use("doc/tree, mvc", function(S, Tree, MVC){
    var $ = S.all;

    var indexJson = [];
    var initPageAddress = '';

    getJsonTree();
    //初始化 索引树
    function getJsonTree(){
        S.io({
            type: 'get'
            ,url: 'json/indexTree.json'
            ,dataType: 'json'
            ,complete: function(data){
                initIndexTree(data);
            }
        })
    }
    function initIndexTree(data){
        indexJson = data;
        var tree = new Tree({
            box: $('#J_IndexTree')
            ,data: data
            ,selectedLeafId: initPageAddress
        })
        tree.on('leaf-change', function(e){
            MVC.Router.navigate('/' + e.leafId + '/');
        })
    }
    


    $(window).on("hashchange", function(e){
        var pageAddress = '';
        if( /\#\!\/(.+)\//.test(window.location.hash) ){
            pageAddress = window.location.hash.match(/\#\!\/(.+)\//)[1];
        }
        if( pageAddress ){
            load(pageAddress);
        }
    })

    function load(pageAddress){
        // alert(pageAddress)
        showMask();
        S.io({
            type: 'get'
            // ,url: 'baseStyle.html'
            ,url: '../src_new/' + pageAddress
            ,complete: function(data){
                data = data || '<div>该组件demo还未添加，敬请期待！</div>';
                hideMask();
                $('#J_PageWrap').html(data, true);
            }
        })
    }

    function showMask(){
        $('#J_Mask').show();
    }
    function hideMask(){
        $('#J_Mask').hide();
    }

    initLoad();
    //初始化页面 加载已存在hash 或者 指定默认值
    function initLoad(){
        
        if( /\#\!\/(.+)\//.test(window.location.hash) ){
            load( window.location.hash.match(/\#\!\/(.+)\//)[1] );
        }
        else{
            // MVC.Router.navigate('');
        }

        if( window.location.hash.match(/\#\!\/(.+)\//) ){
            initPageAddress = window.location.hash.match(/\#\!\/(.+)\//)[1];
        }
    }

    function initSelectedLeaf(name, dataJsonChild){
        // dataJsonChild = dataJsonChild || indexJson;
        // for( var k in dataJsonChild ){
        //     if( dataJsonChild[k]. )
        // }
    }
});