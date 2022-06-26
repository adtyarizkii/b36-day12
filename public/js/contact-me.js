const emailPenerima = 'aditya.rizki0501@gmail.com';

function kirimForm() {
  let name = document.getElementById('input-name').value;
  let email = document.getElementById('input-email').value;
  let phone = document.getElementById('input-phone').value;
  let subject = document.getElementById('choose-subject').value;
  let message = document.getElementById('input-message').value;


  if (name == '' || email == '' || phone == '' || subject == '' || message == '') {
    alert('Tolong isi semua form dengan benar...');
    return
  }

  let a = document.createElement('a');
  a.href = `mailto:${emailPenerima}?subject=${subject}&body=Hallo, my name is ${name}, here i want to ${subject},my message is: ${message}`;
  a.click();

}