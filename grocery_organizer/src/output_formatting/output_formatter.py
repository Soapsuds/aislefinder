from grocery_organizer.src.core.models import FullProduct
from collections import defaultdict

# TODO need to consider output_format option in main
class OutputFormatter:
    def __init__(self, products: [FullProduct], output_format: str):
        self.products = products
        self.output_format = output_format

    def format_output(self):
        if self.output_format == "aisle":
            return self.aisle_format()
        else:
            return self.category_format()

    def aisle_format(self):
        aisle_groups = defaultdict(list)
        for product in self.products:
            if product.aisle_number > 0:
                aisle_groups[product.aisle_number].append(product)
            else:
                aisle_groups[product.category].append(product)

        formatted_string = ''

        #Sort by aisle. When category is present instead sort by these first
        for aisle, products in sorted(aisle_groups.items(), key=lambda element: (isinstance(element[0], str), element[0])):
            formatted_string += 'Aisle ' + str(aisle) + '\n'
            for product in products:
                formatted_line = str(product) + '\n'
                formatted_string += formatted_line
            formatted_string += '\n'

        return formatted_string

    def category_format(self):
        # Group items by their section in the store
        grouped_items = defaultdict(list)
        for item in self.products:
            grouped_items[item.category].append(item)

        formatted_string = ''
        for category, products in grouped_items.items():
            formatted_string += category + '\n'
            for product in products:
                formatted_line = str(product) + '\n'
                formatted_string += formatted_line
            formatted_string += '\n'

        return formatted_string