<?php

/* // ***********NOTE**************

	array will become hash in rails if go through this proxy!, handle it correctly in rails (will fix this if have more time)
	(now using http_build_query and just convert hash to array in rails)
*/


// 
$fullUrl = $_SERVER['REQUEST_URI'];

$url = $_REQUEST['url'];

$decodedUrl = $url;

//encode only path
$separatedHostAndParameters = explode('?', $decodedUrl);
$separatedParameters = explode('&', $separatedHostAndParameters[1]);
for($i = 0; $i<count($separatedParameters); $i++) {
	if(strpos($separatedParameters[$i], 'path')>-1){
		$separatedParameters[$i] = 'path='.rawurlencode(substr($separatedParameters[$i], strpos($separatedParameters[$i], '=')+1));
	}
}
$separatedHostAndParameters[1] = implode('&', $separatedParameters);
$decodedUrl = $separatedHostAndParameters[0].'?'.($separatedHostAndParameters[1]);
// $decodedUrl = $separatedHostAndParameters[0].'?'.rawurlencode($separatedHostAndParameters[1]);

// echo $decodedUrl; exit();
	
// if(isset($_REQUEST['test'])) var_dump($_REQUEST);
// if(isset($_REQUEST['test'])) {var_dump($_FILES); echo 'file length: '. count($_FILES);}

// $decodedUrl = ($url);

$curlSession = curl_init();

// if(isset($_REQUEST['test'])) {var_dump($_REQUEST); exit();}
// var_dump($_REQUEST);
// var_dump($_POST);
// echo $_SERVER['REQUEST_METHOD'];

curl_setopt ($curlSession, CURLOPT_URL, $decodedUrl);
curl_setopt ($curlSession, CURLOPT_HEADER, 0); //don't include header in result

if ( !empty($_FILES) ){
	foreach($_FILES as $param => $file) {
		if ( $file['tmp_name'] )
      $files[$param] = '@' . $file['tmp_name'] . ';';

    	if($file['name']=='blob' && isset($_REQUEST['name'])){
    		$files[$param] .= 'filename=' . $_REQUEST['name'] . ';';
    	}
    	else{
    		$files[$param] .= 'filename=' . $file['name'] . ';';
    	}

    	$files[$param] .= 'type=' . $file['type'];
	}
}

$allPostParams = !empty($files) ? array_merge($_POST, $files): http_build_query($_POST);

switch($_REQUEST['REQUEST_METHOD']){
case 'GET':
	break;
case 'POST':
	curl_setopt ($curlSession, CURLOPT_POST, 1);
	// curl_setopt ($curlSession, CURLOPT_POSTFIELDS, $allPostParams);
	curl_setopt ($curlSession, CURLOPT_POSTFIELDS, $allPostParams);
	break;
case 'PUT':
	curl_setopt ($curlSession, CURLOPT_CUSTOMREQUEST, 'PUT');
	curl_setopt ($curlSession, CURLOPT_POSTFIELDS, $allPostParams);
	break;
case 'DELETE':
	curl_setopt ($curlSession, CURLOPT_CUSTOMREQUEST, 'DELETE');
	curl_setopt ($curlSession, CURLOPT_POSTFIELDS, $allPostParams);
	break;
default:
	
	exit;
}
unset($_REQUEST['REQUEST_METHOD']); //throw away...

curl_setopt($curlSession, CURLOPT_RETURNTRANSFER,1);

if(isset($_REQUEST['test'])) exit();

// quick fix, accept any certificate, should change to only our server
curl_setopt($curlSession, CURLOPT_SSL_VERIFYPEER, false);

$result = curl_exec($curlSession);

// Check that a connection was made
if (curl_error($curlSession)){

  // If it wasn't...
	
  // print curl_error($curlSession);
	http_response_code(503);
    
} else {
	//curl finish
	http_response_code(curl_getinfo($curlSession, CURLINFO_HTTP_CODE));
	echo $result;
}

curl_close ($curlSession);
?>