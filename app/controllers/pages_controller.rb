class PagesController < ApplicationController
  require 'lifx'
  def home
		client = LIFX::Client.lan
		lum = client.lights.with_label('Salon')
		if lum.on? == true
			@etat = 'Allumée'
		else
			@etat = 'Eteinte'
		end

		@nom_lampe = lum.label
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

#
end
