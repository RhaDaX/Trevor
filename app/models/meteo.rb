class Meteo < ActiveRecord::Base
	require 'open-uri'
	require 'nokogiri'
	attr_accessor :temps, :temperature
	def initialize()
		meteo_day = fetch_meteo
		assign_value(meteo_day)
	end
	def fetch_meteo
		Nokogiri::HTML(open("http://www.meteofrance.com/previsions-meteo-france/agen/47000"))
	end

	def assign_value(meteo_day)
		self.temperature = meteo_day.css('#day-symmary-id-00001 .day-summary-temperature').text.gsub!(/^\s/, "").split(/\D+/)
	end

end
