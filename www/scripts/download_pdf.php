<?php
  $filename = $_GET['filename'];
  $file = basename($_GET['temp_filename']);
  $file = '../../../pdf_temp_folder/'.$file;
  if(!file_exists($file)){
    echo 'file not found';
  }
  else{
    header("Cache-Control: public");
    header("Content-Description: File Transfer");
    header("Content-Disposition: attachment; filename=$filename");
    header("Content-Type: application/pdf");
    header("Content-Transfer-Encoding: binary");

    readfile($file);
    unlink($file);
  }
?>