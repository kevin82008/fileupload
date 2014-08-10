(function($) {
	var ctxPath = (function() {//上下文路径
	    /^http:\/\/.*?(\/.*?)\/.*$/.exec(location.href);//正则表达式匹配
	    return RegExp.$1;
	})();
	alert(ctxPath);
	$.fn.fileUpload = function(options) {
		var defaults = {
			btnTitle:"新增",
			width : 200,
			name:	"",
			mode:	"multi",
			groupId:'',//文件组号，唯一
			idNum:0,//计数器，不需要设置值
			readOnly:false,//是否只读
			prefix:'',//上传后的相对目录
			wrapper:'',//控件所在dom，为空时默认为 name + "_wrapper"
			queryAction:'file/{0}/query.json', //{0}对应的是fileGroupId参数
			uploadAction:'file/{0}/upload.json',//{0}对应的是uploadId参数
			progressAction:'file/getProgress.json',
			deleteAction:'file/deleteFile.json',
			downAction:'file/download.json',
			onCallBack:null
		};
		var g = this;
		var options = $.extend(defaults, options);
		g.options = options;
		$.extend(g, _prototype);
		
		return this.each(function() {
			_init.call(g);
		});
	};
	
	var _prototype = {
		_extendOpts:function (){
			var g = this,p=this.options;
			p.frameName = p.name + "_frame";
			p.formName = p.name + "_form";
			p.groupIdName = p.name + "_groupId";
			p.btnName = p.name + "_btnName";
			p.btnTitle = p.btnTitle;
			p.wrapper = p.wrapper || (p.name + "_wrapper");
			p.queryAction = g._addCtxPath(p.queryAction);
			p.uploadAction = g._addCtxPath(p.uploadAction);
			p.progressAction = g._addCtxPath(p.progressAction);
			p.deleteAction = g._addCtxPath(p.deleteAction);
			p.downAction = g._addCtxPath(p.downAction);
		},
		_addCtxPath:function(path){
			if(path.indexOf("http")==0 || path.indexOf("/")==0){
				return path;
			}else{
				return ctxPath + "/" + path;
			}
		},
		/**
		 * 创建进度条，id为progress_ + form的ID
		 * @param g
		 * @param form
		 * @returns
		 */
		_createProgress:function (form){
			var g = this,p=g.options;
			var formId = form.attr("id");
			var fileName = $("[name="+p.btnName+"]",form).val();
			fileName =  fileName.substring(fileName.lastIndexOf("\\")+1);
			var progress=$("<div class='upload-file-list'><div id='progress_"+formId+"' class='progress'><div class='progress_percent'></div></div><span class='waiting'>等待上传...</span></div>");
			
			g.wrapper.append(progress);
			progress.prepend($("<span class='upload-file-name'>"+fileName+"</span>"));
			return progress;
		},
		//初始化时调用获取附件信息
		_initFileInfo:function(){
			var g = this, p = g.options;
			var groupId = p.groupId;
			if(groupId){
				$.ajax({  
		            type:"post",  
		            url:format(p.queryAction,[groupId]),
		            success:function(data){
		            	g._initFileList(data);
		            },
		            error:function(result){
		            	$.fn.fileUpload.alert("初始化附件失败");
		            }
		        });
			}
		},
		//生成附件的dom
		_initFileList:function(data){
			var g = this, p = g.options;
			var data = data["model_list"];
			for(var i=0;i<data.length;i++){
				var fileInfo = data[i];
				var div = $("<div class='upload-file-list'><span class='upload-file-name'>"+fileInfo["file_name"]+"</span></div>");
				g.wrapper.append(div);
				
				div.attr("file_id",fileInfo["file_id"]);
				if(p.readOnly!=true){
					var del = $("<div class='upload-delete'>删除</div>").appendTo(div);
					del.bind("click",function(){
						var target = $(this).parent();
						g._deleteFile(target);
					});
				}
				$(".upload-file-name",div).addClass("upload-file-name-down").bind("click",function(){
					var target = $(this).parent();
					g._downloadFile(target);
				});
			}
		},
		_createForm:function (){
			var g = this, p=g.options;
			var frame = g._createFrame();
			p.idNum++;
			var form = $('<form action="'+format(p.uploadAction,["num_"+p.idNum]) +'" method="post" enctype="multipart/form-data" id="'+p.formName+'_'+p.idNum+'" name="'+p.formName+'_'+p.idNum+'" target="'+frame.attr("id")+'"></form>').appendTo($(document.body));
			form.append('<input type="hidden" name="file_upload_mode" value="'+p.mode+'">');
			form.append('<input type="hidden" name="get_all_file" value="false">');
			form.append('<input type="hidden" name="upload_id" value="num_'+p.idNum+'">');
			form.append('<input type="hidden" name="prefix" value="'+p.prefix+'">');
			form.append('<input type="hidden" name="file_group_id" value="'+p.groupId+'">');
			g.btn.css("display","none").removeClass("upload-file").appendTo(form).unbind("change");
			g.btn = newBtn = $('<input type="file" class="upload-file" name="'+p.btnName+'">').appendTo(g.link);	
			g.btn[0].g=g;
			newBtn.bind("change",g._uploadFile);
			form.frame = frame;
			return form;
		},
		_createFrame:function(){
			var g = this, p=g.options;
			p.idNum++;
			var id = p.frameName+"_"+p.idNum;
			var frame = $('<iframe id="'+id+'" name="'+id+'" style="display:none" ></iframe>').appendTo($(document.body));
			var frameEl =  $(window.frames[id].document.body);
			frameEl.append("<div name='emptyDiv'></div>");
			return frame;
		},
		/**
		 * 获取对应的进度条
		 */
		_getProgress:function(form){
			var g = this,p=g.options;
			var formId = form.attr("id");
			var target = $("#progress_"+formId);
			var	uploadId = $("[name=upload_id]",form).val();
			$.ajax({  
	            type:"post",  
	            url:p.progressAction,
	            data:{"upload_id":uploadId},
	            success:function(result){
	            	g._setProgress(target,result['percent'],false);
	            }  
	        });
		},
		/**
		 * 设置target的进度
		 * @param target 进度条对应的div
		 */
		_setProgress:function(target,progress,type){
			var g = this;
			var parent = target.parent();
			$(".progress_percent",target).css("width",progress*100+"%");
			if(type && progress>=1 && $(".upload-delete",parent).length==0){
				var del = $("<div class='upload-delete'>删除</div>");
				target.before(del);
				
				del.bind("click",function(){
					g._deleteFile(parent);
				});
				
				$(".upload-file-name",parent).addClass("upload-file-name-down").bind("click",function(){
					g._downloadFile(parent);
				});
			}
		},
		_setErrorInfo:function(target,errorInfo){
			var g = this;
			target.parent().append("<div class='progress-error'>"+errorInfo+"</div>");
		},
		_removeProgress:function (target){
			var g = this;
			if(target.hasClass("upload-file-list")){
				target.unbind('click').remove();
			}else{
				target.parent().remove();
			}
		},
		_callback:function(){
			var g = this, p = g.options;
			//获取当前正在提交的表单
			var formObj = g._getLoadingObj();
			var form;
			//获取正在提交的表单是否已返回
			if(formObj){
				form = formObj["form"];
				var target = $("#progress_"+form.attr("id"));
				var frameId = form.frame.attr("id"); 
				var frame =  $(window.frames[frameId].document.body);
				var div = $("[name=emptyDiv]",frame);
				if(div.length == 0){
					//处理返回数据
					var result = g._getResult(frame);
					if(result["error_no"] && result["error_no"]!=0){
						//此时是上传出错，需要显示错误信息
						var errorInfo = result["error_msg"];
						g._setErrorInfo(target,errorInfo);
						formObj["status"]="error";
					}else{
						result = result["model_list"]||{};
						p.groupId = result["file_group_id"];
						//设置fileId
						//设置进度条为100%
						target.parent().attr("file_id",result["file_id"]);
						g._setProgress(target,1,true);
						
						//移除已经提交完成的表单
						g.formStatus.splice($.inArray(formObj,g.formStatus),1); 
						$(window.frames[frameId]).remove();
						form.remove();
						//提交其他待提交的表单
						g._sumibtForm();
					}
				}else{
					g._getProgress(form);
				}
			}else{
				g._sumibtForm();
			}
		},
		_getLoadingObj:function(){
			var g = this;
			var formObj;
			var length = g.formStatus.length;
			for(var i=0;i<length;i++){
				var obj = g.formStatus[i];
				if(obj['status']=="loading"){
					formObj = obj;
					break;
				}
			}
			return formObj;
		},
		_getResult:function(frame){
			var content=frame.children();
			var result;
			try{
				if(content.length==1){
					result = content.html()||"{}";
				}else{
					result = frame.html()||"{}";
				}
				result = JSON.parse(result);
				if("object" != typeof result){
					result = JSON.parse(result);
				}
			}catch(e){
				result={"error_no":-99,"error_info":"解析异常"};
			}
			
			return result;
		},
		_sumibtForm:function(){
			var g = this, p = g.options;
			//判断是否还有表单要提交
			var forms = $.grep(g.formStatus,function(obj,i){
				return obj["status"]=="waiting";
			});
			if(forms.length>0){
				
				var obj = forms[0];
				obj["status"]="loading";
				var form = obj["form"];
				var formId = form.attr("id");
				var progress = $("#progress_"+formId);
				$(".waiting",progress.parent()).remove();
				$("[name=file_group_id]",form).val(p.groupId);
					
				form.submit();
			}else{
				window.clearInterval(g.interval);	
				g.interval = undefined;
			}
		},
		/**
		 * 删除附件
		 */
		_deleteFile:function(target){
			var g = this,p=g.options;
			var fileId = target.attr("file_id");
			$.ajax({  
	            type:"post",  
	            url:p.deleteAction,
	            data:{file_id:fileId},
	            success:function(msg){
	            	g._removeProgress(target);
	            },
	            error:function(msg){
	            	
	            	$.fn.fileUpload.alert("删除附件异常，请重试");
	            }
	        });
		},
		_downloadFile:function (target){
			var g = this,p=g.otions;
			var fileId = target.attr("file_id");
			g._download(fileId);
		},
		_download:function (fileId) {
			var g = this,p=g.options;
			var frame = $("#_downFrame");
			if(frame.length == 0){
				frame = $("<iframe id='_downFrame' style='display:none;' name='_downFrame'></iframe>").appendTo($(document.body));
			}
			var downForm = $("#_downForm");
			if(downForm.length==0){
				downForm = $("<form id='_downForm' action='" + p.downAction + "' target='_downFrame' method='post'></form>").appendTo($(document.body));
				downForm.append("<input type='hidden' name='file_id'></input>");
			}
			$("[name=file_id]",downForm).val(fileId);
			downForm.submit();
		},
		//上传文件，需要放入队列中进行处理
		_uploadFile:function(){
			var g = this.g,p=g.options;
			var form = g._createForm();
			var progress = g._createProgress(form);
			g.formStatus.push({"form":form,"status":"waiting"});
			//每隔500毫秒执行callback处理上传进度
			//真正上传的操作也在callback里进行处理
			if(!g.interval){
				g.interval = window.setInterval(function(){
					g._callback();
				}, 500); 
			}
		},
		//获取groupId
		getValue:function(){
			var g = this,p=g.options;
			return p.groupId;
		}
	};
	
	function _init(){
		var g = this,p=this.options;
		g._extendOpts();
		var wrapper = $("#"+p.wrapper).css("width",p.width);
		g.wrapper=wrapper;
		
		g._initFileInfo();
		
		if(true != p.readOnly){
			var link = $('<div class="upload-file-link">'+p.btnTitle+'</div>').appendTo(wrapper);
			var btn = $('<input type="file" class="upload-file" name="'+p.btnName+'">').appendTo(link);
			btn.bind('change',g._uploadFile);
			g.btn = btn;
			g.btn[0].g=g;
			g.link = link;
			g.link[0].g = g;
			g.formStatus=[];
		}
		return g;
	}
	
	$.fn.fileUpload.alert=function(msg){
		alert(msg);
	};
	
	function format(source,params){
		$.each(params, function( i, n ) {
			source = source.replace( new RegExp("\\{" + i + "\\}", "g"), function() {
				return n;
			});
		});
		return source;
	}
	
})(jQuery);