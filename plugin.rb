# name: elserath-calendar
# about: Affiche la date actuelle selon le calendrier d’Elserath (Ère 1099)
# version: 0.2
# authors: La Sainte Pioche

enabled_site_setting :elserath_calendar_enabled

after_initialize do
  add_to_serializer(:header) do
    true
  end
end
