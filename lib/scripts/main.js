function TemplateApplication(){
	
	var currentTemplateFile = "";
	var currentTemplateDesc = "";
	var originalTemplateText = "";
	var tagCount = 0;
	var tagList = new Array();
	var templateFound = false;
	var currentTag = undefined;
	var templatePreview = undefined;
	
	this.initPage = function(){	
		initTabs();
		initChooseTemplate();
		initCopyTemplate();
		var oIframe = document.getElementById("templatePreview");
    	var oDoc = oIframe.contentWindow || oIframe.contentDocument;
		templatePreview = oDoc;
	};
	
	function initTabs(){
		$('#tabs > ul').tabs({ fx: {
				opacity: 'toggle',
  				duration: 'fast'
			}
		});
		$('#tabs > ul').data('disabled.tabs', [1, 2, 3]);
	}
	
	function initCopyTemplate(){
		$('#copyText').click(function copyToClipboard()
		{
			var textElem = $('#finishedTemplate')[0];
			textElem.focus();
			textElem.select();
		});
	};
	
	function initChooseTemplate(){
		
		// read config file to load template list
		$.get("file:./templates/template_list.txt", {}, function(data){
			var dataArr = new Array();
			dataArr	= data.split("\n");
			$.each(dataArr,function(){
				var templAttr = this.split("|");
				if (templAttr[0] && templAttr[1]) {
					// Have to do this old school way for some reason in IE
					// Doesn't render correctly with jQuery
					var elOptNew = document.createElement('option');
					elOptNew.text = templAttr[1].replace("\r", '');
					elOptNew.value = templAttr[0].replace("\r", '');
					var elSel = $('#templateSelect')[0];
					try {
						elSel.add(elOptNew, null); // standards compliant; doesn't work in IE
					} 
					catch (ex) {
						elSel.add(elOptNew); // IE only
					}
				}
			});
		});
		
		// choose template button click event handler
		$('#templateSelectSubmit').click(function(){
			
			resetTemplate();
			currentTemplateFile = $('#templateSelect').val();
			currentTemplateDesc = $('#templateSelect :selected').text();
			var templPath	= "file:./templates/" + currentTemplateFile;
			
			try {
				// load template file
				$.get(templPath, {}, function(data){
					if (data == '') {
						showStatusMessage("Unable to open or empty template - " + currentTemplateFile, true);
						return;
					}
					originalTemplateText = data;
					templateFound = true;
					
					// add template text to copy/paste window
					$('#finishedTemplate').val(data);
					
					// remove any style declarations and add template to DOM
					var re = new RegExp('<style>[^<]*</style>', "g");
					var dataNoStyle = data.replace(re, '{{{styleplaceholder}}}');
					$('#hiddenTemplateContent').html(dataNoStyle);
					
					// add template html to preview pane
					if (templatePreview) {
						templatePreview.document.write(data);
						templatePreview.document.close();
					}
				});
			}
			catch (ex) {
				showStatusMessage("Failed to find template - " + currentTemplateFile, true);
				return;	
			}
			
			$("#updateTemplate").click( function() {updateTemplate();});
			
			// parse template
			setTimeout(parseTemplate,500);
		});
	};
	
	// parse template file
	function parseTemplate() {
		
		// make sure template loaded - hta hack...doesn't throw exception.
		if( !templateFound ){
				showStatusMessage("Failed to locate template - " + currentTemplateFile, true);
				return;
		}
		
		// parse template
		var arr = [];
		var t = $(".drt_tag");
		$(".drt_tag").each(function(){
			var to = new tagObj();
			
			// replace any '-' in name used as separator for replacement
			to.tagName = $(this).attr('id').replace('-','_');
			
			// input type
			if($(this).attr('attr')) {
				var attr = $(this).attr('attr');
				var attrArr = new Array();
				attrArr = attr.split(" ");
				$.each(attrArr, function(){
					if( /type_/.test(this)){
						to.tagType = this;
					}
					else{
						to.optionsArr[this] = true;
					}
				});
			} else {
				to.tagType = 'type_text';
			}
			
			// tag label for input item
			if($(this).attr('title')) {
				to.tagLabel = $(this).attr('title');
			} else {
				to.tagLabel = 'Undefined Field Label';
			}
			
			// default text
			if( to.tagType == 'type_text' || to.tagType == 'type_textarea'){
				to.defaultVal = $(this).html();
			}
			
			to.templateElem = this;
			
			addInputFormElement(to);
			arr[tagCount] = to;
			tagCount++;

		});
		tagList = arr;
		
		// template load/parse successful!!
		showStatusMessage("Template " + currentTemplateFile + " Loaded Successfully");
		$('#tabs > ul').data('disabled.tabs', []);
		$("#currentTemplate").removeClass('no_template');		
		$("#currentTemplate").html(currentTemplateDesc + ' File:' + currentTemplateFile);
	};
	
	// edit tab input item
	function addInputFormElement(to){
	
		// create edit field based on tag type
		var editElem = $("#editForm")[0];
		
		$('<div></div>').addClass('template_row').attr('id', to.tagName + '-div').appendTo('#editForm');
		addInputFormRow(to);
	}
	
	// input item row
	function addInputFormRow(to){
		
		// list types need count
		var count = '';
		if (to.tagType == 'type_list') {
			count = '_' + to.editListElemCount;
			++to.editListElemCount;
		}
		
		// input row container
		$('<div></div>')
			.attr('id',to.tagName + '-row' + count)
			.addClass('edit_row')
			.appendTo('#' + to.tagName + '-div');
		
		// input row label
		var inputLabel = '';
		if(to.tagType != 'type_list' || to.editListElemCount  === 1){
			inputLabel = to.tagLabel + ':&nbsp;';
		}
		$('<span></span>')
			.addClass('content_label')
			.attr('id',to.tagName + '-label' + count)
			.html(inputLabel)
			.appendTo('#' + to.tagName + '-row' + count);
			
		// check if input is optional
		// no support for lists...yet
		if( to.optionsArr['optional'] && to.tagType != 'type_list'){

			$('<span></span>')
				.attr('id',to.tagName + '-option' + count)
				.addClass('edit_optional')
				.html('Show ' +  inputLabel)
				.appendTo('#' + to.tagName + '-label' + count);
				
			$('<input type="checkbox"></input>')
				.attr({
					name: to.tagName + '-optional',
					selected: true
				})
				.addClass('edit_checkbox')
				.appendTo('#' + to.tagName + '-option' + count);
				
			$('input:checkbox').each( function() {
				this.checked = true;
			});
		}
		
		// input
		if( to.tagType == 'type_textarea'){
			inputType	= 'textarea';
			inputClass	= 'edit_textarea';
		}
		else if (to.tagType == 'type_contact') {
			inputType	= 'select';
			inputClass	= 'edit_select';
		}
		else {
			inputType = 'input';
			inputClass = 'edit_text';
		}
		$('<' + inputType + '>')
			.addClass(inputClass)
			.attr('name',to.tagName + '-edit' + count)
			.attr('id',to.tagName +'-edit' + count)
			.appendTo('#' + to.tagName + '-row' + count);
			
		// default text
		if(to.defaultVal){
			$("[name='" + to.tagName + "-edit" + count + "']").val(to.defaultVal);
		}
			
		// list controls
		if (to.tagType == 'type_list' ){	
			if (to.editListElemCount === 1) {
				$('<a></a>')
					.attr('href', '#')
					.addClass('add_list_item')
					.html("Add Item")
					.click(function(){
						addInputFormRow(to);
					}).appendTo('#' + to.tagName + '-label' + count);
			}
			else {
				$('<a></a>')
				.attr('href','#')
				.addClass('rem_list_item')
				.html("<span class='rem_list_item_text'>xxx</span>")
				.click(function(){
					remInputRow(to.tagName,count);
				})
				.appendTo('#' + to.tagName + '-row' + count);
			}
		}
		
		// contact options
		else if (to.tagType == 'type_contact') {
			// read config file to load template list
			$.get("file:./templates/contact_list.txt", {}, function(data){
				var dataArr = data.split("\n");
				to.contactArray = dataArr;
				$.each(dataArr, function(){
					var contactInfo = this.split("|");

					if( contactInfo[0] && contactInfo[1] ) {
					
						var elOptNew = document.createElement('option');
						elOptNew.text = contactInfo[0];
						elOptNew.value = contactInfo[1].replace("\r",'');
						var elSel = $('#' + to.tagName + '-edit' + count)[0];
						try {
							elSel.add(elOptNew, null); // standards compliant; doesn't work in IE
						}
						catch(ex) {
							elSel.add(elOptNew);// IE only
						}	

					}
						
				});
			});
		}
		
		return;	
	};
	
	// remove input row
	function remInputRow(inputName,index){
		$('#' + inputName + '-row' + index).remove();
	};
	
	// reset template variables
	function resetTemplate(){
		$('#tabs > ul').data('disabled.tabs', [1, 2, 3]);
		templateFound = false;
		tagCount = 0;
		$("#currentTemplate").addClass('no_template');
		$("#currentTemplate").html('no template loaded');
		$('#finishedTemplate').val('');
		$("#editForm").html('');
		if (templatePreview) {
			templatePreview.document.body.innerHTML = '';
		}
	};
	
	// show status message
	function showStatusMessage(msg,error){
		error = error || false;
		if( error ){
			$('#statusBar').addClass('error_msg');
		}
		else {
			$('#statusBar').removeClass('error_msg');
		}
		$('#statusBar').html(msg);
		$('#statusBar').toggle("slide", {
			direction: "down"
		}, 500);
		
		setTimeout(function(){$('#statusBar').toggle("slide", {
			direction: "down"
		}, 1000);},2500);
	}

	// update template values
	function updateTemplate(){
		
		var theList = tagList;
		$.each(theList,function(){
			currentTag = this;
			
			// text inputs
			if ((this.tagType == 'type_text') || (this.tagType == 'type_textarea')) {

				// check if this area is optional
				var editText = $("input[name^='" + this.tagName + "-edit']").val();
				var optionalElem = $("input[@name='" + this.tagName + "-optional']")[0];
				if (!optionalElem || $(optionalElem).is(':checked')) {
					$(templatePreview.document.getElementById(this.tagName)).html(editText);
				} else {
					$(templatePreview.document.getElementById(this.tagName)).html('');
				}
			}
			
			// list inputs
			else if (this.tagType == 'type_list') {
				
					var uList = $(templatePreview.document.getElementById(this.tagName))[0];
				
					// clear out existing list items.
					$(uList).html('');
					
					// spin through list inputs and append list items
					$("input[name^='" + this.tagName + "-edit']").each(function(){
						if ($(this).val()) {
							$(uList).append('<li>' + $(this).val() + '</li>');
						}
					});
			}
			else if (this.tagType == 'type_contact') {
				var selectedName = $("select[name^='" + this.tagName + "'] :selected").text();
				var selectedEmail = $("select[name^='" + this.tagName + "']").val();
				var templateElem = $(templatePreview.document.getElementById(this.tagName))[0];
				$(templateElem).html('');
				if( selectedEmail == 'all'){
					var contArray = this.contactArray;
					var count = 0;
					$.each(contArray, function(){
						var contactInfo = this.split("|");
						if( contactInfo[0] && contactInfo[1] ){
							contactInfo[1] = contactInfo[1].replace("\r",'');
							if (contactInfo[1] != 'all') {
								if( count != 0 ){ $(templateElem).append('&nbsp;/&nbsp;');}
								$(templateElem).append('<a href="mailto:' + contactInfo[1] + '?subject=Flyer%20Response">' + contactInfo[0]+ "</a> ");
								count++;
							}
						}
					});
				}
				else {
					$(templateElem).append('<a href="mailto:' + selectedEmail + '?subject=Flyer%20Response">' + selectedName + '</a> ');
				}
			}
		});
		
		// update textarea
		var iframeContent = $(templatePreview.document.documentElement).html();
		$("#finishedTemplate").val("<html>\n" + iframeContent + "\n</html>");
		showStatusMessage("Template Changes Saved - Click the 'Preview' tab to view alterations");
	}
}

// Object for template tags
function tagObj() {
	this.tagName = "";
	this.tagLabel = "";
	this.tagType = "";
	this.editElemName = "";
	this.editListElemCount = 0;
	this.optionsArr = [];
	this.defaultVal = "";
	this.contactArray = [];
}
