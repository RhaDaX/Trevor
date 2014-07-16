class PagesController < ApplicationController
  def home
  	#client = Fitgem::Client.new({:consumer_key => 'a99a1cee773548c6b90fe2eb7d11825c', :consumer_secret => '1631e5b33d1b4a89b1045e79326444fe'})
 	#@fitbit = client.user_info
 	
  end
  
 def httprequest
 	require "net/http"
 	require "uri"
 	@passed_params = params[:parameters]
 	case @passed_params
	 	when "tf1"
	 		@chaine = 1
	 	when "france2"
	 		@chaine = 2
	 	when "france3"
	 		@chaine = 3
	 	when "canalplus"
	 		@chaine = 4
	 	when "france5"
	 		@chaine = 5
	 	when "m6"
	 		@chaine = 6
	 	when "arté"
	 		@chaine = 7
	 	when "direct8"
	 		@chaine = 8
	 	when "w9"
	 		@chaine = 9
	 	when "tmc"
	 		@chaine = 10
	 	when "nt1"
	 		@chaine = 11
	 	when "nrj12"
	 		@chaine = 12
	 	when "lcp"
	 		@chaine = 13
	 	when "france4"
	 		@chaine = 14
	 	when "bfm"
	 		@chaine = 15
	 	when "i-télé"
	 		@chaine = 16
	 	when "d17"
	 		@chaine = 17
	 	when "gulli"
	 		@chaine = 18
	 	else
	 		@chaine = 0
	 		valid = false
 	end	
 	unless valid == false
 		speak "A ton service" 
 	else
 		speak "commande non reconnue"
 	end
 	uri = URI.parse('http://hd1.freebox.fr/pub/remote_control')
 	digit = @chaine.to_s.size
 	@first, @second = @chaine.to_s.split('')
 	#Scan du nombre de touche appuyé pour gerer l'affichage des chaines
 	case digit
 	when 1
 		@request1 = Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @first })
 		
 	when 2
 		@request1 = Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @first, 'long' => true })
 		@request2 = Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @second })
 	else
 		puts "Erreur de chaines"
 	end
 end
 load 'operating_system.rb'
 
def speak(text)
  if OperatingSystem.windows?
    require 'win32/sapi5'
    v = Win32::SpVoice.new
    v.Speak(text)
  elsif OperatingSystem.mac?
    IO.popen(["say"], "w") {|pipe| pipe.puts text}
  else
    # Try to run "espeak". No OperatingSystem check: "espeak" is
    # for Linux but is also an optional package for BSD.
    IO.popen(["espeak", "-stdin"], "w") {|pipe| pipe.puts text}
  end
end
#
end
