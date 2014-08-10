fileupload是一个基于jquery的上传控件，支持如下功能：
1. 多附件上传，所有上传的文件基于同一个fileGroupId，每一个文件有自己独立的fileId
2. 上传时支持实时显示上传进度（非模拟进度，是实际进度）
3. 支持配置是否只读，只读时不支持上传附件和删除附件
4. 附件支持 新增、删除、下载。

使用时需要注意的：
1. 控件基于jquery 1.7.2，未测试其他版本
2. 配置控件 上传、新增、删除、下载以及获取进度条的action时，注意需要相对工程的根目录配置，前面不要带 /
3. 控件的action需要返回json数据，需要注意如下内容：
   a. 新增返回的json为如下格式，至少需要返回fileId和fileGroupId字段：
   {model_list:[{"file_group_id":"XXXXX","file_id":"XXXXXXX"}]}
   同时，注意返回时，需要设置返回数据的头部信息为 HTML，java中为  response.setContentType("text/html;charset=UTF-8");
   b. 删除时后台通过参数 file_id 接收要删除的 文件编号，不抛异常则认为是删除成功
   c. 下载时后台通过参数 file_id 接收要下载的文件编号，返回文件流
   d. 获取文件列表时，后台通过url里的参数 fileGroupId查询该组号下的所有附件，的返回json数据为：
   {model_list:[{file_group_id:'XX',file_id:'XXX1',file_name:'XX文件',file_path:'test/test/XX文件_20140810010101.html',file_size:1001},{file_group_id:'XX',file_id:'XXX2',file_name:'XX文件',file_path:'test/test/XX文件_20140810010102.html',file_size:1001}]}
   数据返回为json
   e. 获取文件上传进度，返回的格式为json格式：
   {"percent":10}
   注意，为了支持多个文件上传读取进度，每一个文件上传时有一个唯一的 uploadId，获取文件上传进度需要根据该参数进行，提交时的参数名为 upload_id
4. 上传时后台需要注意如下：
   a. 使用 commons-fileupload-1.2.1.jar 或更高版本。
   b. 实现了ProgressListener接口，在该接口的实现类中，首先从url里根据规则解析出来uploadId参数，然后往session例如该uploadId对应的进度。
   c. 继承 CommonsMultipartResolver 实现一个类xx.xx.xx.CommonsMultipartResolver，在该实现类中通过类似下面代码注入进度条监听：
      String encoding = determineEncoding(request);
      FileUpload fileUpload = prepareFileUpload(encoding);
      ProgressListener pListener = new UploadProgressListener(request);
      fileUpload.setProgressListener(pListener);
   d. 在spring的配置文件中配置multipartResolver为上面步骤中新实现的类： 
      <bean id="multipartResolver" class="xx.xx.xx.CommonsMultipartResolver" p:defaultEncoding="UTF-8" >
   e.上传的action的路径中有一个参数是uploadId，实现ProgressListener接口的类从路径中读取参数然后设置进度。


==========
