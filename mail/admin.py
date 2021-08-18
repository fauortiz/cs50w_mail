from django.contrib import admin

# Register your models here.
from .models import *

class EmailAdmin(admin.ModelAdmin):
    list_display = ("user", "sender", "subject")
    filter_horizontal = ("recipients",)

admin.site.register(User)
admin.site.register(Email, EmailAdmin)
