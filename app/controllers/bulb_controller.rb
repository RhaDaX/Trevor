class BulbController < ApplicationController
	require 'lifx'
	attr_accessor :etat, :nom_lampe

	def fetch_light
		LIFX::Client.lan
	end

	def assign_values(bulb)
		lum = bulb.lights.with_label('Salon')
		if lum.on? == true
			@etat = 'Allumée'
		else
			@etat = 'Eteinte'
		end

		@nom_lampe = lum.label
	end

	def initialize()
		bulb = fetch_light
		assign_values(bulb)
	end
	load 'operating_system.rb'
	#include Speeching
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
	def switch_on
		bulb = LIFX::Client.lan
		lum = bulb.lights.with_label('Salon')
		if lum.on? == true
			speak "La lumiere est déjà allumée"
		else
			lum.turn_on
		end
	end
	def switch_off
		bulb = LIFX::Client.lan
		lum = bulb.lights.with_label('Salon')
		if lum.off? == true
			speak "La lumiere est déjà éteinte"
		else
			lum.turn_off
		end

	end
end
