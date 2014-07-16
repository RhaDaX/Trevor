class PagesController < ApplicationController
  def home
  	#client = Fitgem::Client.new({:consumer_key => 'a99a1cee773548c6b90fe2eb7d11825c', :consumer_secret => '1631e5b33d1b4a89b1045e79326444fe'})
 	#@fitbit = client.user_info
 	
  end
  
 def httprequest
 	require "net/http"
 	require "uri"
 	@passed_params = params[:parameters]
 	uri = URI.parse('http://hd1.freebox.fr/pub/remote_control')
 	Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @passed_params })
 end
 def httprequest2
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
	 	when "itélé"
	 		@chaine = 16
	 	when "d17"
	 		@chaine = 17
	 	when "gulli"
	 		@chaine = 18
	 	else
	 		@chaine = 0
 	end	
 	uri = URI.parse('http://hd1.freebox.fr/pub/remote_control')
 	digit = @chaine.to_s.size
 	@first, @second = @chaine.to_s.split('')
 	case digit
 	when 1
 		Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @first, 'long' => true })

 	when 2
 		Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @first, 'long' => true })
 		Net::HTTP.post_form( uri, {'code' => '73098161', 'key' => @second })
 	else
 		puts "Erreur de chaines"
 	end
 end
#
end
